import { db } from "./db";
import { sql, and, eq } from "drizzle-orm";
import { appointments, stylistServices, clients } from "@shared/schema";

/**
 * Optimized analytics query that combines multiple database operations
 * into a single efficient query using CTEs (Common Table Expressions)
 */
export async function getOptimizedAnalytics(stylistId: string, period: 'week' | 'month') {
  const daysBack = period === 'week' ? 7 : 30;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysBack);
  const startDateStr = startDate.toISOString().split('T')[0];

  try {
    // Combined query using CTEs for better performance
    const result = await db.execute(sql`
      WITH appointment_base AS (
        SELECT 
          a.id,
          a.date,
          a.total_price,
          a.service_id,
          a.client_id,
          s.service_name,
          COALESCE(c.first_name || ' ' || c.last_name, c.first_name, c.last_name, 'Unknown') as client_name
        FROM ${appointments} a
        LEFT JOIN ${stylistServices} s ON a.service_id = s.id
        LEFT JOIN ${clients} c ON a.client_id = c.id
        WHERE a.stylist_id = ${stylistId}
          AND a.status = 'completed'
          AND a.date >= ${startDateStr}
      ),
      stats AS (
        SELECT 
          COUNT(*) as appointment_count,
          COALESCE(SUM(total_price), 0) as revenue
        FROM appointment_base
      ),
      top_services AS (
        SELECT 
          service_name,
          COUNT(*) as count,
          COALESCE(SUM(total_price), 0) as revenue
        FROM appointment_base
        WHERE service_name IS NOT NULL
        GROUP BY service_name
        ORDER BY COUNT(*) DESC
        LIMIT 5
      ),
      busy_days AS (
        SELECT 
          date,
          COUNT(*) as appointment_count
        FROM appointment_base
        GROUP BY date
        ORDER BY COUNT(*) DESC
        LIMIT 10
      ),
      loyal_clients AS (
        SELECT 
          client_id,
          client_name,
          COUNT(*) as total_visits
        FROM appointment_base
        WHERE client_id IS NOT NULL
        GROUP BY client_id, client_name
        ORDER BY COUNT(*) DESC
        LIMIT 10
      )
      SELECT 
        'stats' as type,
        json_build_object(
          'appointmentCount', stats.appointment_count,
          'revenue', stats.revenue
        ) as data
      FROM stats
      UNION ALL
      SELECT 
        'topServices' as type,
        json_agg(
          json_build_object(
            'serviceName', service_name,
            'count', count,
            'revenue', revenue
          )
        ) as data
      FROM top_services
      UNION ALL
      SELECT 
        'busyDays' as type,
        json_agg(
          json_build_object(
            'date', date,
            'appointmentCount', appointment_count
          )
        ) as data
      FROM busy_days
      UNION ALL
      SELECT 
        'loyalClients' as type,
        json_agg(
          json_build_object(
            'clientId', client_id,
            'fullName', client_name,
            'totalVisits', total_visits
          )
        ) as data
      FROM loyal_clients
    `);

    // Parse the combined results
    const analytics = {
      appointmentCount: 0,
      revenue: 0,
      topServices: [],
      busyDays: [],
      loyalClients: []
    };

    result.rows.forEach((row: any) => {
      const { type, data } = row;
      switch (type) {
        case 'stats':
          analytics.appointmentCount = data.appointmentCount || 0;
          analytics.revenue = data.revenue || 0;
          break;
        case 'topServices':
          analytics.topServices = data || [];
          break;
        case 'busyDays':
          analytics.busyDays = data || [];
          break;
        case 'loyalClients':
          analytics.loyalClients = data || [];
          break;
      }
    });

    return analytics;
  } catch (error) {
    console.error('Error in optimized analytics query:', error);
    // Fallback to individual queries if the optimized version fails
    throw error;
  }
}

/**
 * Batch query utility for efficient database operations
 */
export async function batchQuery<T>(
  queries: Array<() => Promise<T>>,
  batchSize: number = 5
): Promise<T[]> {
  const results: T[] = [];
  
  for (let i = 0; i < queries.length; i += batchSize) {
    const batch = queries.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(query => query()));
    results.push(...batchResults);
  }
  
  return results;
}
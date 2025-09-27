import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { 
  Search, 
  MapPin, 
  Calendar,
  DollarSign,
  Clock,
  Briefcase,
  Filter,
  Star,
  Eye,
  MessageCircle,
  Heart,
  TrendingUp,
  Users,
  Home,
  Scissors,
  TreePine
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

export function DiscoverJobsPage() {
  // Mock data for demonstration
  const jobListings = [
    {
      id: 1,
      title: "Wedding Hair & Makeup",
      client: "Jennifer Smith",
      category: "Hairstylist",
      location: "Downtown NYC",
      budget: "$300-500",
      postedTime: "2 hours ago",
      deadline: "This Saturday",
      description: "Looking for a professional hairstylist for my wedding day. Need someone experienced with updos and natural makeup.",
      urgency: "high",
      clientRating: 4.8,
      clientReviews: 12,
      tags: ["Wedding", "Updo", "Makeup"],
      applicationCount: 5
    },
    {
      id: 2,
      title: "Weekly House Cleaning",
      client: "Mike Johnson",
      category: "House Cleaning",
      location: "Brooklyn Heights",
      budget: "$80-120",
      postedTime: "5 hours ago",
      deadline: "Next Monday",
      description: "Need reliable weekly house cleaning service for a 2-bedroom apartment. Pet-friendly cleaner preferred.",
      urgency: "medium",
      clientRating: 4.9,
      clientReviews: 23,
      tags: ["Weekly", "Pet-friendly", "Apartment"],
      applicationCount: 8
    },
    {
      id: 3,
      title: "Garden Landscaping Project",
      client: "Sarah Davis",
      category: "Landscaping",
      location: "Queens, NY",
      budget: "$800-1200",
      postedTime: "1 day ago",
      deadline: "End of month",
      description: "Complete backyard makeover including lawn renovation, flower beds, and small tree planting.",
      urgency: "low",
      clientRating: 4.6,
      clientReviews: 8,
      tags: ["Backyard", "Lawn", "Planting"],
      applicationCount: 12
    },
    {
      id: 4,
      title: "Corporate Event Hair Styling",
      client: "EventCorp Ltd",
      category: "Hairstylist",
      location: "Manhattan",
      budget: "$200-300/person",
      postedTime: "3 hours ago",
      deadline: "Next Friday",
      description: "Need 3 hairstylists for corporate photoshoot. Professional styles for 15 executives.",
      urgency: "high",
      clientRating: 5.0,
      clientReviews: 45,
      tags: ["Corporate", "Photoshoot", "Professional"],
      applicationCount: 3
    }
  ];

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'high': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Hairstylist': return <Scissors className="h-4 w-4" />;
      case 'House Cleaning': return <Home className="h-4 w-4" />;
      case 'Landscaping': return <TreePine className="h-4 w-4" />;
      default: return <Briefcase className="h-4 w-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Discover Jobs</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">Find new opportunities and grow your business</p>
            </div>
            <div className="flex items-center space-x-3">
              <Badge variant="outline" className="flex items-center space-x-1">
                <TrendingUp className="h-3 w-3" />
                <span>24 new jobs today</span>
              </Badge>
            </div>
          </div>

          {/* Search and Filters */}
          <Card className="p-4">
            <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input 
                  placeholder="Search jobs by title, client, or description..." 
                  className="pl-10"
                  data-testid="input-search-jobs"
                />
              </div>
              <Select>
                <SelectTrigger className="w-full md:w-48" data-testid="select-category">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="hairstylist">Hairstylist</SelectItem>
                  <SelectItem value="cleaning">House Cleaning</SelectItem>
                  <SelectItem value="landscaping">Landscaping</SelectItem>
                </SelectContent>
              </Select>
              <Select>
                <SelectTrigger className="w-full md:w-36" data-testid="select-location">
                  <SelectValue placeholder="Location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Areas</SelectItem>
                  <SelectItem value="manhattan">Manhattan</SelectItem>
                  <SelectItem value="brooklyn">Brooklyn</SelectItem>
                  <SelectItem value="queens">Queens</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" data-testid="button-filters">
                <Filter className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        </div>

        {/* Tabs for different views */}
        <Tabs defaultValue="all" className="mb-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all" data-testid="tab-all-jobs">All Jobs</TabsTrigger>
            <TabsTrigger value="recommended" data-testid="tab-recommended">Recommended</TabsTrigger>
            <TabsTrigger value="recent" data-testid="tab-recent">Recent</TabsTrigger>
            <TabsTrigger value="saved" data-testid="tab-saved">Saved</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-6">
            {/* Job Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <Card className="p-4">
                <div className="flex items-center space-x-2">
                  <Briefcase className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Total Jobs</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">127</p>
                  </div>
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center space-x-2">
                  <Users className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Applied Today</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">8</p>
                  </div>
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center space-x-2">
                  <Heart className="h-5 w-5 text-red-600" />
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Saved Jobs</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">15</p>
                  </div>
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center space-x-2">
                  <DollarSign className="h-5 w-5 text-yellow-600" />
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Avg. Budget</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">$425</p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Job Listings */}
            <div className="space-y-4">
              {jobListings.map((job) => (
                <Card key={job.id} className="p-6 hover:shadow-lg transition-shadow" data-testid={`job-card-${job.id}`}>
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between">
                    <div className="flex-1">
                      <div className="flex items-start space-x-4">
                        <Avatar className="h-12 w-12 shrink-0">
                          <AvatarImage src={undefined} />
                          <AvatarFallback>
                            {job.client.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-2">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                              {job.title}
                            </h3>
                            <Badge className={getUrgencyColor(job.urgency)}>
                              {job.urgency}
                            </Badge>
                          </div>
                          <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400 mb-3">
                            <div className="flex items-center space-x-1">
                              {getCategoryIcon(job.category)}
                              <span>{job.category}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <MapPin className="h-4 w-4" />
                              <span>{job.location}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <DollarSign className="h-4 w-4" />
                              <span>{job.budget}</span>
                            </div>
                          </div>
                          <p className="text-gray-700 dark:text-gray-300 mb-4 line-clamp-2">
                            {job.description}
                          </p>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4 text-sm text-gray-500">
                              <div className="flex items-center space-x-1">
                                <Clock className="h-4 w-4" />
                                <span>Posted {job.postedTime}</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <Calendar className="h-4 w-4" />
                                <span>Due {job.deadline}</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <Users className="h-4 w-4" />
                                <span>{job.applicationCount} applied</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col space-y-2 mt-4 md:mt-0 md:ml-6">
                      <div className="flex items-center space-x-1 text-sm">
                        <Star className="h-4 w-4 text-yellow-500 fill-current" />
                        <span className="font-medium">{job.clientRating}</span>
                        <span className="text-gray-500">({job.clientReviews} reviews)</span>
                      </div>
                      <div className="flex space-x-2">
                        <Button size="sm" data-testid={`button-apply-${job.id}`}>
                          Apply Now
                        </Button>
                        <Button variant="outline" size="sm" data-testid={`button-save-${job.id}`}>
                          <Heart className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" data-testid={`button-message-${job.id}`}>
                          <MessageCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  {/* Tags */}
                  {job.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                      {job.tags.map((tag, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </Card>
              ))}
            </div>

            {/* Load More */}
            <div className="flex justify-center mt-8">
              <Button variant="outline" className="px-8" data-testid="button-load-more">
                Load More Jobs
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="recommended" className="mt-6">
            <Card className="p-8 text-center">
              <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Personalized Recommendations</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Complete your profile to get job recommendations tailored to your skills and preferences.
              </p>
              <Button data-testid="button-complete-profile">Complete Profile</Button>
            </Card>
          </TabsContent>

          <TabsContent value="recent" className="mt-6">
            <Card className="p-8 text-center">
              <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Recent Activity</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Your recently viewed and applied jobs will appear here.
              </p>
            </Card>
          </TabsContent>

          <TabsContent value="saved" className="mt-6">
            <Card className="p-8 text-center">
              <Heart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Saved Jobs</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Jobs you've saved for later will appear here.
              </p>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default DiscoverJobsPage;
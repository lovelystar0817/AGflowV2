import { ArrowRight, Smartphone, Calendar, DollarSign, Users, Sparkles, RefreshCw, TrendingUp, Scissors, Brush, Palette, Heart } from "lucide-react";
import { motion } from "framer-motion";

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 40 },
  whileInView: { opacity: 1, y: 0 },
  transition: { delay, duration: 0.8 },
  viewport: { once: true },
});

export default function LandingPage() {
  return (
    <div className="bg-gray-950 text-white font-sans">
      {/* Hero Section */}
      <section className="relative min-h-screen flex flex-col items-center justify-center text-center px-6 overflow-hidden">
        {/* Background gradient blobs */}
        <div className="absolute -top-20 -left-20 w-96 h-96 bg-gradient-to-r from-purple-600 to-pink-500 rounded-full blur-3xl opacity-30 animate-pulse"></div>
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-gradient-to-r from-pink-400 to-rose-500 rounded-full blur-3xl opacity-20 animate-pulse"></div>

        <motion.h1
          {...fadeUp(0)}
          className="text-5xl md:text-7xl font-extrabold bg-gradient-to-r from-pink-400 via-purple-400 to-rose-500 bg-clip-text text-transparent"
        >
          Flow Styles
        </motion.h1>

        <motion.p
          {...fadeUp(0.3)}
          className="mt-6 max-w-2xl text-lg text-gray-300"
        >
          Run your business smarter, save time, and keep clients coming back — all without giving up a cut of your money.
        </motion.p>

        <motion.div
          {...fadeUp(0.6)}
          className="mt-10 flex flex-col sm:flex-row gap-4"
        >
          <a
            href="/auth"
            className="px-8 py-4 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 text-white font-semibold flex items-center justify-center shadow-lg hover:scale-105 transition-transform"
          >
            Get Started Free <ArrowRight className="ml-2 h-5 w-5" />
          </a>
          <a
            href="/auth"
            className="px-8 py-4 rounded-xl border border-pink-400 text-pink-300 font-semibold hover:bg-pink-900/40 shadow-sm transition"
          >
            Log In
          </a>
        </motion.div>
      </section>

      {/* Who It's For Section */}
      <section className="py-24 bg-gradient-to-br from-gray-900 via-gray-850 to-gray-800">
        <motion.h2
          {...fadeUp(0)}
          className="text-4xl font-bold text-center mb-12"
        >
          Who It's For
        </motion.h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto px-6">
          {[
            {
              icon: Scissors,
              title: "Hairstylists",
              accentColor: "rose",
              hoverGlow: "hover:shadow-rose-500/30",
              borderHover: "hover:border-rose-400/40",
            },
            {
              icon: Brush,
              title: "Barbers",
              accentColor: "cyan",
              hoverGlow: "hover:shadow-cyan-500/30",
              borderHover: "hover:border-cyan-400/40",
            },
            {
              icon: Palette,
              title: "Nail Techs",
              accentColor: "violet",
              hoverGlow: "hover:shadow-violet-500/30",
              borderHover: "hover:border-violet-400/40",
            },
            {
              icon: Heart,
              title: "Massage Therapists",
              accentColor: "teal",
              hoverGlow: "hover:shadow-teal-500/30",
              borderHover: "hover:border-teal-400/40",
            },
          ].map((item, i) => {
            const IconComponent = item.icon;
            
            // Define specific hover colors for each profession
            const hoverColorMap = {
              rose: 'group-hover:text-rose-500',
              cyan: 'group-hover:text-cyan-500', 
              violet: 'group-hover:text-violet-500',
              teal: 'group-hover:text-teal-500'
            };
            
            const iconHoverColor = hoverColorMap[item.accentColor as keyof typeof hoverColorMap];
            
            return (
              <motion.div
                key={i}
                {...fadeUp(i * 0.15)}
                className={`group p-8 rounded-xl bg-gray-800/60 backdrop-blur-sm border border-gray-700/50 ${item.borderHover} shadow-lg ${item.hoverGlow} hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 hover:scale-105 text-center`}
              >
                <div className="flex justify-center mb-6">
                  <IconComponent 
                    className={`h-12 w-12 text-gray-300 transition-colors duration-300 group-hover:scale-105 ${iconHoverColor}`}
                    strokeWidth={1.5} 
                  />
                </div>
                <h3 className="font-bold text-2xl text-white text-center">
                  {item.title}
                </h3>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Why Flow Styles */}
      <section className="py-24 bg-gray-900">
        <motion.h2
          {...fadeUp(0)}
          className="text-4xl font-bold text-center mb-12"
        >
          Why Flow Styles?
        </motion.h2>
        <div className="grid gap-10 md:grid-cols-4 max-w-6xl mx-auto px-6">
          {[
            {
              icon: Smartphone,
              title: "Your Own App",
              text: "Get a fully branded app to showcase your work & promote your business.",
            },
            {
              icon: Calendar,
              title: "Instant Booking Links",
              text: "Share one link anywhere — Facebook, Instagram & let clients instantly book.",
            },
            {
              icon: DollarSign,
              title: "No Platform Fees",
              text: "Unlike other apps, Flow Styles wants you to keep your money. Transactions are handled between you & your clients.",
            },
            {
              icon: Users,
              title: "Client Discovery",
              text: "New clients can find you in-app without ads or fees. Build your book of business effortlessly.",
            },
          ].map((item, i) => {
            const IconComponent = item.icon;
            return (
              <motion.div
                key={i}
                {...fadeUp(i * 0.2)}
                className="p-8 rounded-2xl bg-gray-800 shadow-lg hover:shadow-xl hover:shadow-pink-500/20 transition-all duration-300 transform hover:-translate-y-2 hover:scale-105"
              >
                <div className="flex justify-center mb-6">
                  <div className="p-4 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 shadow-lg">
                    <IconComponent className="h-8 w-8 text-white" strokeWidth={1.5} />
                  </div>
                </div>
                <h3 className="font-bold text-xl text-white text-center mb-4">
                  {item.title}
                </h3>
                <p className="text-gray-300 text-center leading-relaxed">{item.text}</p>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* AI Assistant Section */}
      <section className="py-24 bg-gray-900">
        <motion.h2
          {...fadeUp(0)}
          className="text-4xl font-bold text-center mb-12 text-cyan-300"
        >
          Your Own AI Assistant
        </motion.h2>
        <div className="grid gap-10 md:grid-cols-3 max-w-6xl mx-auto px-6">
          {[
            {
              icon: Sparkles,
              title: "Automate",
              text: "Set up your assistant to automatically send reminders, promotions, and loyalty rewards.",
            },
            {
              icon: RefreshCw,
              title: "Smart Scheduling",
              text: "Client cancels? No problem. Your AI assistant will notify the following scheduled client and fill that spot.",
            },
            {
              icon: TrendingUp,
              title: "Grows With You",
              text: "The more your business grows, the more your assistant learns and helps take you to the next level.",
            },
          ].map((item, i) => {
            const IconComponent = item.icon;
            return (
              <motion.div
                key={i}
                {...fadeUp(i * 0.2)}
                className="p-8 rounded-2xl bg-gray-800 shadow-lg hover:shadow-xl hover:shadow-cyan-500/20 transition-all duration-300 transform hover:-translate-y-2"
              >
                <div className="flex justify-center mb-6">
                  <div className="p-4 rounded-full bg-gradient-to-r from-gray-600 to-gray-500 shadow-lg group">
                    <IconComponent className="h-8 w-8 text-cyan-300 hover:text-cyan-400 transition-colors duration-300" strokeWidth={1.5} />
                  </div>
                </div>
                <h3 className="font-bold text-xl text-white text-center mb-4">
                  {item.title}
                </h3>
                <p className="text-gray-300 text-center leading-relaxed">{item.text}</p>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Comparison Section */}
      <section className="py-24 bg-gray-900">
        <div className="max-w-3xl mx-auto px-6">
          <motion.h2
            {...fadeUp(0)}
            className="text-3xl font-bold mb-12 text-center"
          >
            Flow Styles Is Better The Rest
          </motion.h2>

          <div className="space-y-8">
            {/* Flow Styles Card */}
            <motion.div {...fadeUp(0.1)} className="rounded-2xl bg-gray-800 shadow-lg p-8">
              <h3 className="text-2xl font-bold mb-6 bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent text-center">Flow Styles</h3>
              <ul className="space-y-3 text-lg">
                <li className="flex items-center gap-2 text-green-400 font-semibold"><span>✅</span> <span className="text-gray-100">Keep 100% of your income</span></li>
                <li className="flex items-center gap-2 text-green-400 font-semibold"><span>✅</span> <span className="text-gray-100">Your own branded mini-app</span></li>
                <li className="flex items-center gap-2 text-green-400 font-semibold"><span>✅</span> <span className="text-gray-100">Instant booking links + QR codes</span></li>
                <li className="flex items-center gap-2 text-green-400 font-semibold"><span>✅</span> <span className="text-gray-100">Built-in client discovery</span></li>
                <li className="flex items-center gap-2 text-green-400 font-semibold"><span>✅</span> <span className="text-gray-100">AI-powered tools</span></li>
                <li className="flex items-center gap-2 text-green-400 font-semibold"><span>✅</span> <span className="text-gray-100">Transparent flat pricing</span></li>
              </ul>
            </motion.div>

            {/* StyleSeat Card */}
            <motion.div {...fadeUp(0.2)} className="rounded-2xl bg-gray-800 shadow-lg p-8">
              <h3 className="text-2xl font-bold mb-6 bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent text-center">StyleSeat</h3>
              <ul className="space-y-3 text-lg">
                <li className="flex items-center gap-2 text-red-400 font-semibold"><span>❌</span> <span className="text-gray-100">30% fee on new clients + processing fees</span></li>
                <li className="flex items-center gap-2 text-red-400 font-semibold"><span>❌</span> <span className="text-gray-100">No branded app</span></li>
                <li className="flex items-center gap-2 text-orange-400 font-semibold"><span>⚠️</span> <span className="text-gray-100">Profile links only (not branded)</span></li>
                <li className="flex items-center gap-2 text-red-400 font-semibold"><span>❌</span> <span className="text-gray-100">Pay for ads / referrals</span></li>
                <li className="flex items-center gap-2 text-red-400 font-semibold"><span>❌</span> <span className="text-gray-100">No AI tools</span></li>
                <li className="flex items-center gap-2 text-red-400 font-semibold"><span>❌</span> <span className="text-gray-100">Variable fees depending on client source</span></li>
              </ul>
            </motion.div>

            {/* Booksy Card */}
            <motion.div {...fadeUp(0.3)} className="rounded-2xl bg-gray-800 shadow-lg p-8">
              <h3 className="text-2xl font-bold mb-6 bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent text-center">Booksy</h3>
              <ul className="space-y-3 text-lg">
                <li className="flex items-center gap-2 text-red-400 font-semibold"><span>❌</span> <span className="text-gray-100">Lead/Boost fees (commission on new clients)</span></li>
                <li className="flex items-center gap-2 text-red-400 font-semibold"><span>❌</span> <span className="text-gray-100">No branded app</span></li>
                <li className="flex items-center gap-2 text-orange-400 font-semibold"><span>⚠️</span> <span className="text-gray-100">Profile links only (not branded)</span></li>
                <li className="flex items-center gap-2 text-red-400 font-semibold"><span>❌</span> <span className="text-gray-100">Pay per lead via Boost</span></li>
                <li className="flex items-center gap-2 text-orange-400 font-semibold"><span>⚠️</span> <span className="text-gray-100">Limited automation, not true AI</span></li>
                <li className="flex items-center gap-2 text-red-400 font-semibold"><span>❌</span> <span className="text-gray-100">Subscription + varying platform fees</span></li>
              </ul>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-24 bg-gray-950">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <motion.h2
            {...fadeUp(0)}
            className="text-4xl font-bold mb-4"
          >
            Simple Pricing, No Surprises
          </motion.h2>
          <motion.p
            {...fadeUp(0.2)}
            className="text-xl text-gray-400 mb-16"
          >
            {/* Removed per request */}
          </motion.p>

          <motion.div
            {...fadeUp(0.4)}
            className="bg-gradient-to-br from-gray-800 to-gray-900 hover:from-gray-750 hover:to-gray-850 border border-purple-500/20 hover:border-purple-400/40 hover-lift hover:shadow-2xl hover:shadow-purple-500/20 rounded-xl p-8 max-w-md mx-auto text-center transition-all duration-300"
          >
            <h3 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-4">
              {/* Removed per request */}
            </h3>
            
            <p className="text-5xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-6">
              $19.99<span className="text-white text-xl">/month</span>
            </p>
            
            <ul className="space-y-3 text-gray-300 mb-8">
              <li className="hover:scale-105 transition-transform duration-200 hover:text-purple-300 cursor-default">
                ✓ Your own branded app
              </li>
              <li className="hover:scale-105 transition-transform duration-200 hover:text-purple-300 cursor-default">
                ✓ Instant booking links
              </li>
              <li className="hover:scale-105 transition-transform duration-200 hover:text-purple-300 cursor-default">
                ✓ No platform fees
              </li>
              <li className="hover:scale-105 transition-transform duration-200 hover:text-purple-300 cursor-default">
                ✓ Client discovery
              </li>
              <li className="hover:scale-105 transition-transform duration-200 hover:text-purple-300 cursor-default">
                ✓ AI assistant (reminders, nudges, smart scheduling)
              </li>
            </ul>
            
            <a
              href="/auth"
              className="block w-full py-3 rounded-lg font-semibold bg-gradient-to-r from-pink-500 to-purple-600 text-white hover:from-pink-400 hover:to-purple-500 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl text-center"
            >
              Start Free Trial
            </a>
            
            <p className="text-sm text-gray-400 mt-4">
              7-day free trial included. Cancel anytime.
            </p>
          </motion.div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="py-24 bg-gradient-to-r from-pink-600 to-purple-600 text-center">
        <motion.h2
          {...fadeUp(0)}
          className="text-3xl font-bold"
        >
          All-in-one assistant for your chair
        </motion.h2>
        <motion.p
          {...fadeUp(0.2)}
          className="mt-3 text-white/90 max-w-2xl mx-auto"
        >
          Stop losing time and money to no-shows and lead fees. Flow Styles keeps your
          chair full and your business growing.
        </motion.p>
        <motion.a
          {...fadeUp(0.4)}
          href="/auth"
          className="mt-8 inline-block px-8 py-4 rounded-xl bg-white text-purple-700 font-semibold hover:opacity-90 transition"
        >
          Get Started Free
        </motion.a>
      </section>

      {/* Footer */}
      <footer className="py-16 bg-gray-950 border-t border-gray-800">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <div className="mb-8">
            <h3 className="text-2xl font-bold bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
              Flow Styles
            </h3>
            <p className="mt-2 text-gray-400">
              The smart way to run your beauty & wellness business
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row justify-center items-center gap-6 text-sm text-gray-400">
            <a href="/privacy" className="hover:text-pink-400 transition">Privacy Policy</a>
            <a href="/terms" className="hover:text-pink-400 transition">Terms of Service</a>
            <a href="/contact" className="hover:text-pink-400 transition">Contact</a>
          </div>
          
          <div className="mt-8 text-sm text-gray-500">
            © 2024 Flow Styles. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
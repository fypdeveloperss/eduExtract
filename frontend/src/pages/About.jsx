import React from "react";
import { motion } from "framer-motion";
import Header from "../components/Header";
import { 
  Target, 
  Lightbulb, 
  Users, 
  Award, 
  Heart, 
  Globe, 
  BookOpen, 
  Zap,
  ArrowRight,
  CheckCircle,
  Star,
  Rocket
} from "lucide-react";

const About = () => {
  const fadeInUp = {
    initial: { opacity: 0, y: 60 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6 }
  };

  const staggerContainer = {
    animate: {
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const values = [
    {
      icon: Lightbulb,
      title: "Innovation",
      description: "Constantly pushing boundaries to create better learning experiences through cutting-edge technology.",
      color: "text-yellow-500"
    },
    {
      icon: Globe,
      title: "Accessibility",
      description: "Making quality education available to everyone, regardless of their background or location.",
      color: "text-blue-500"
    },
    {
      icon: Award,
      title: "Excellence",
      description: "Committed to delivering the highest quality educational content and user experience.",
      color: "text-purple-500"
    },
    {
      icon: Heart,
      title: "Passion",
      description: "Driven by our love for education and our commitment to empowering learners worldwide.",
      color: "text-red-500"
    }
  ];

  const stats = [
    { number: "1M+", label: "Active Learners" },
    { number: "50+", label: "Countries Served" },
    { number: "99%", label: "Satisfaction Rate" },
    { number: "24/7", label: "Support Available" }
  ];

  const teamMembers = [
    {
      name: "Saad Ameer",
      role: "Developer",
      description: "Full-stack developer specializing in React and Node.js technologies.",
      avatar: "SA"
    },
    {
      name: "Sarosh Ali",
      role: "Developer",
      description: "Backend developer expert in API development and database management.",
      avatar: "SA"
    },
    {
      name: "Syed Hamza",
      role: "Developer",
      description: "Frontend developer focused on creating responsive and interactive user interfaces.",
      avatar: "SH"
    },
    {
      name: "Dr. Imran",
      role: "Project Supervisor",
      description: "Academic supervisor providing guidance and oversight for the educational technology project.",
      avatar: "DI"
    }
  ];

  return (
    <>
      <Header />
      <div className="min-h-screen bg-white dark:bg-[#121212] text-[#171717] dark:text-[#fafafacc] transition-colors duration-300">
        {/* Hero Section */}
        <motion.section 
          className="pt-32 pb-16 px-4 sm:px-6 lg:px-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
        >
          <div className="max-w-7xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="inline-flex items-center gap-2 bg-white/80 dark:bg-[#171717]/80 backdrop-blur-sm border border-gray-200 dark:border-gray-700 rounded-full px-4 py-2 mb-8"
            >
              <Star className="w-4 h-4 text-yellow-500" />
              <span className="text-sm font-medium text-gray-700 dark:text-[#fafafacc]">About EduExtract</span>
            </motion.div>

            <motion.h1 
              className="text-4xl sm:text-5xl md:text-6xl font-bold mb-6"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
            >
              Empowering Learners Through
              <br />
              <span className="text-[#171717cc] dark:text-[#fafafacc]">Innovative Education</span>
            </motion.h1>

            <motion.p 
              className="text-lg sm:text-xl text-[#171717cc] dark:text-[#fafafacc] max-w-4xl mx-auto mb-12 leading-relaxed"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
            >
              We're revolutionizing education by making high-quality learning accessible to everyone, 
              everywhere. Our AI-powered platform transforms any content into interactive, personalized 
              learning experiences.
            </motion.p>

            {/* Stats */}
            <motion.div 
              className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-16"
              variants={staggerContainer}
              initial="initial"
              animate="animate"
            >
              {stats.map((stat, index) => (
                <motion.div
                  key={stat.label}
                  variants={fadeInUp}
                  className="text-center"
                >
                  <div className="text-3xl sm:text-4xl font-bold text-[#171717] dark:text-[#fafafacc] mb-2">
                    {stat.number}
                  </div>
                  <div className="text-sm text-[#171717cc] dark:text-[#fafafacc]">
                    {stat.label}
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </motion.section>

        {/* Mission & Vision Section */}
        <motion.section 
          className="py-20 bg-[#FAFAFA] dark:bg-[#121212]"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6">
                Our Mission & Vision
              </h2>
              <p className="text-lg text-[#171717cc] dark:text-[#fafafacc] max-w-3xl mx-auto">
                We're driven by a clear purpose to transform education and make learning accessible to all.
              </p>
            </motion.div>

            <div className="grid md:grid-cols-2 gap-8">
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8 }}
                viewport={{ once: true }}
                className="bg-white dark:bg-[#171717] p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-[#EEEEEE] dark:border-gray-700"
              >
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                    <Target className="w-6 h-6 text-white" />
          </div>
                  <h3 className="text-2xl font-bold">Our Mission</h3>
        </div>
                <p className="text-[#171717cc] dark:text-[#fafafacc] leading-relaxed text-lg">
                To democratize education by making high-quality learning resources accessible to everyone. 
                We strive to break down barriers to education through innovative technology and personalized 
                  learning experiences that adapt to each learner's unique needs.
              </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8 }}
                viewport={{ once: true }}
                className="bg-white dark:bg-[#171717] p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-[#EEEEEE] dark:border-gray-700"
              >
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
                    <Lightbulb className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold">Our Vision</h3>
            </div>
                <p className="text-[#171717cc] dark:text-[#fafafacc] leading-relaxed text-lg">
                To create a world where anyone can learn anything, anywhere, at any time. We envision 
                a future where education is personalized, engaging, and accessible to all, powered by 
                  cutting-edge AI technology that makes learning more effective and enjoyable.
              </p>
              </motion.div>
            </div>
          </div>
        </motion.section>

        {/* Core Values Section */}
        <motion.section 
          className="py-20"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6">
                Our Core Values
              </h2>
              <p className="text-lg text-[#171717cc] dark:text-[#fafafacc] max-w-3xl mx-auto">
                These principles guide everything we do and shape our commitment to excellence in education.
              </p>
            </motion.div>

            <motion.div 
              className="grid md:grid-cols-2 lg:grid-cols-4 gap-8"
              variants={staggerContainer}
              initial="initial"
              whileInView="animate"
              viewport={{ once: true }}
            >
              {values.map((value, index) => (
                <motion.div
                  key={value.title}
                  variants={fadeInUp}
                  className="group bg-white dark:bg-[#171717] p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-[#EEEEEE] dark:border-gray-700 text-center"
                >
                  <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                    <value.icon className={`w-8 h-8 ${value.color}`} />
            </div>
                  <h3 className="text-xl font-bold mb-3">{value.title}</h3>
                  <p className="text-[#171717cc] dark:text-[#fafafacc] leading-relaxed">
                    {value.description}
                  </p>
                </motion.div>
              ))}
            </motion.div>
            </div>
        </motion.section>

        {/* Team Section */}
        <motion.section 
          className="py-20 bg-[#FAFAFA] dark:bg-[#121212]"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6">
                Meet Our Team
              </h2>
              <p className="text-lg text-[#171717cc] dark:text-[#fafafacc] max-w-3xl mx-auto">
            We are a diverse team of passionate educators, technologists, and innovators working together 
                to revolutionize the way people learn.
              </p>
            </motion.div>

            <motion.div 
              className="grid md:grid-cols-2 lg:grid-cols-4 gap-8"
              variants={staggerContainer}
              initial="initial"
              whileInView="animate"
              viewport={{ once: true }}
            >
              {teamMembers.map((member, index) => (
                <motion.div
                  key={member.name}
                  variants={fadeInUp}
                  className="group bg-white dark:bg-[#171717] p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-[#EEEEEE] dark:border-gray-700 text-center"
                >
                  <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-[#171717] to-[#121212] dark:from-gray-600 dark:to-gray-700 rounded-full flex items-center justify-center text-white font-bold text-xl group-hover:scale-110 transition-transform duration-300">
                    {member.avatar}
                  </div>
                  <h3 className="text-xl font-bold mb-2">{member.name}</h3>
                  <p className="text-sm text-[#171717cc] dark:text-[#fafafacc] mb-3 font-medium">
                    {member.role}
          </p>
                  <p className="text-[#171717cc] dark:text-[#fafafacc] text-sm leading-relaxed">
                    {member.description}
                  </p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </motion.section>

        {/* Technology Section */}
        <motion.section 
          className="py-20"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6">
                Powered by Innovation
              </h2>
              <p className="text-lg text-[#171717cc] dark:text-[#fafafacc] max-w-3xl mx-auto">
                Our cutting-edge technology stack enables us to deliver personalized learning experiences at scale.
              </p>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-8">
              <motion.div
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.1 }}
                viewport={{ once: true }}
                className="bg-white dark:bg-[#171717] p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-[#EEEEEE] dark:border-gray-700 text-center"
              >
                <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center">
                  <Zap className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-4">AI-Powered Learning</h3>
                <p className="text-[#171717cc] dark:text-[#fafafacc] leading-relaxed">
                  Advanced machine learning algorithms that adapt to each learner's pace and style, 
                  providing personalized content recommendations and real-time feedback.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                viewport={{ once: true }}
                className="bg-white dark:bg-[#171717] p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-[#EEEEEE] dark:border-gray-700 text-center"
              >
                <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center">
                  <BookOpen className="w-8 h-8 text-white" />
            </div>
                <h3 className="text-xl font-bold mb-4">Smart Content Generation</h3>
                <p className="text-[#171717cc] dark:text-[#fafafacc] leading-relaxed">
                  Transform any content into interactive learning materials including summaries, 
                  quizzes, flashcards, and presentations in seconds.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.3 }}
                viewport={{ once: true }}
                className="bg-white dark:bg-[#171717] p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-[#EEEEEE] dark:border-gray-700 text-center"
              >
                <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center">
                  <Users className="w-8 h-8 text-white" />
            </div>
                <h3 className="text-xl font-bold mb-4">Collaborative Learning</h3>
                <p className="text-[#171717cc] dark:text-[#fafafacc] leading-relaxed">
                  Connect with peers, share knowledge, and learn together through our 
                  collaborative spaces and community features.
                </p>
              </motion.div>
          </div>
        </div>
        </motion.section>

        {/* Call to Action */}
        <motion.section 
          className="py-20 bg-[#171717] dark:bg-[#121212]"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-6">
                Ready to Transform Your Learning?
              </h2>
              
              <p className="text-xl text-white mb-10 max-w-2xl mx-auto">
                Join millions of learners who are already using EduExtract to master new subjects 
                faster and more effectively.
          </p>
              
              <motion.a
                href="/dashboard"
                className="inline-flex items-center gap-3 bg-white text-[#171717] px-8 py-4 rounded-full font-bold text-lg shadow-lg hover:shadow-xl transition-all duration-300"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Rocket className="w-6 h-6" />
                Start Learning Now
                <ArrowRight className="w-5 h-5" />
              </motion.a>
              
              <p className="text-white text-sm mt-4">
                No credit card required • Start learning in seconds
              </p>
            </motion.div>
        </div>
        </motion.section>
      </div>
    </>
  );
};

export default About;

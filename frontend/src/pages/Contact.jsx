import React, { useState } from "react";
import { motion } from "framer-motion";
import Header from "../components/Header";
import { 
  Mail, 
  Phone, 
  MapPin, 
  Clock, 
  Send, 
  CheckCircle, 
  MessageCircle,
  Users,
  Globe,
  ArrowRight
} from "lucide-react";

const Contact = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });

  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Handle submission logic here (e.g., send to backend or show success)
    console.log("Form Submitted:", formData);
    setIsSubmitted(true);
    setTimeout(() => {
      setIsSubmitted(false);
      setFormData({ name: "", email: "", subject: "", message: "" });
    }, 3000);
  };

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

  const contactInfo = [
    {
      icon: Mail,
      title: "Email Us",
      details: "hello@eduextract.com",
      description: "Send us an email anytime",
      color: "text-blue-500"
    },
    {
      icon: Phone,
      title: "Call Us",
      details: "+1 (555) 123-4567",
      description: "Mon-Fri from 8am to 6pm",
      color: "text-green-500"
    },
    {
      icon: MapPin,
      title: "Visit Us",
      details: "San Francisco, CA",
      description: "Come say hello at our office",
      color: "text-red-500"
    },
    {
      icon: Clock,
      title: "Response Time",
      details: "Within 24 hours",
      description: "We typically respond quickly",
      color: "text-purple-500"
    }
  ];

  const faqs = [
    {
      question: "How quickly will I receive a response?",
      answer: "We typically respond to all inquiries within 24 hours during business days."
    },
    {
      question: "Do you offer technical support?",
      answer: "Yes! Our technical support team is available 24/7 to help with any issues."
    },
    {
      question: "Can I schedule a demo?",
      answer: "Absolutely! Contact us to schedule a personalized demo of our platform."
    },
    {
      question: "Do you have an API?",
      answer: "Yes, we offer a comprehensive API for developers. Contact us for access."
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
              <MessageCircle className="w-4 h-4 text-blue-500" />
              <span className="text-sm font-medium text-gray-700 dark:text-[#fafafacc]">Get in Touch</span>
            </motion.div>

            <motion.h1 
              className="text-4xl sm:text-5xl md:text-6xl font-bold mb-6"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
            >
              We'd Love to
              <br />
              <span className="text-[#171717cc] dark:text-[#fafafacc]">Hear From You</span>
            </motion.h1>

            <motion.p 
              className="text-lg sm:text-xl text-[#171717cc] dark:text-[#fafafacc] max-w-4xl mx-auto mb-12 leading-relaxed"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
            >
              Have questions, feedback, or just want to say hello? We're here to help and would 
              love to hear from you. Send us a message and we'll get back to you as soon as possible.
            </motion.p>
          </div>
        </motion.section>

        {/* Contact Info Cards */}
        <motion.section 
          className="py-16 px-4 sm:px-6 lg:px-8"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          <div className="max-w-7xl mx-auto">
            <motion.div 
              className="grid md:grid-cols-2 lg:grid-cols-4 gap-8"
              variants={staggerContainer}
              initial="initial"
              whileInView="animate"
              viewport={{ once: true }}
            >
              {contactInfo.map((info, index) => (
                <motion.div
                  key={info.title}
                  variants={fadeInUp}
                  className="group bg-white dark:bg-[#171717] p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-[#EEEEEE] dark:border-gray-700 text-center"
                >
                  <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                    <info.icon className={`w-8 h-8 ${info.color}`} />
                  </div>
                  <h3 className="text-xl font-bold mb-2">{info.title}</h3>
                  <p className="text-[#171717] dark:text-[#fafafacc] font-semibold mb-1">
                    {info.details}
                  </p>
                  <p className="text-sm text-[#171717cc] dark:text-[#fafafacc]">
                    {info.description}
                  </p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </motion.section>

        {/* Contact Form Section */}
        <motion.section 
          className="py-20 bg-[#FAFAFA] dark:bg-[#121212]"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6">
                Send Us a Message
              </h2>
              <p className="text-lg text-[#171717cc] dark:text-[#fafafacc] max-w-2xl mx-auto">
                Fill out the form below and we'll get back to you as soon as possible.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              viewport={{ once: true }}
              className="bg-white dark:bg-[#171717] p-8 rounded-2xl shadow-xl border border-[#EEEEEE] dark:border-gray-700"
            >
              {isSubmitted ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-12"
                >
                  <div className="w-20 h-20 mx-auto mb-6 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-10 h-10 text-green-500" />
                  </div>
                  <h3 className="text-2xl font-bold mb-4 text-[#171717] dark:text-[#fafafacc]">
                    Message Sent Successfully!
                  </h3>
                  <p className="text-[#171717cc] dark:text-[#fafafacc] text-lg">
                    Thank you for reaching out. We'll get back to you within 24 hours.
                  </p>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
            <div>
                      <label className="block text-sm font-semibold mb-2 text-[#171717] dark:text-[#fafafacc]">
                        Full Name *
                      </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                        className="w-full p-4 rounded-xl bg-white dark:bg-[#121212] border border-[#EEEEEE] dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 text-[#171717] dark:text-[#fafafacc]"
                        placeholder="Enter your full name"
              />
            </div>

            <div>
                      <label className="block text-sm font-semibold mb-2 text-[#171717] dark:text-[#fafafacc]">
                        Email Address *
                      </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                        className="w-full p-4 rounded-xl bg-white dark:bg-[#121212] border border-[#EEEEEE] dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 text-[#171717] dark:text-[#fafafacc]"
                        placeholder="Enter your email address"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2 text-[#171717] dark:text-[#fafafacc]">
                      Subject *
                    </label>
                    <input
                      type="text"
                      name="subject"
                      value={formData.subject}
                      onChange={handleChange}
                      required
                      className="w-full p-4 rounded-xl bg-white dark:bg-[#121212] border border-[#EEEEEE] dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 text-[#171717] dark:text-[#fafafacc]"
                      placeholder="What's this about?"
              />
            </div>

            <div>
                    <label className="block text-sm font-semibold mb-2 text-[#171717] dark:text-[#fafafacc]">
                      Message *
                    </label>
              <textarea
                name="message"
                value={formData.message}
                onChange={handleChange}
                required
                      rows={6}
                      className="w-full p-4 rounded-xl bg-white dark:bg-[#121212] border border-[#EEEEEE] dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 text-[#171717] dark:text-[#fafafacc] resize-none"
                      placeholder="Tell us more about your inquiry..."
                    />
            </div>

                  <motion.button
              type="submit"
                    className="w-full bg-[#171717] dark:bg-white text-white dark:text-[#171717] px-8 py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center gap-3 group"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
            >
                    <Send className="w-5 h-5" />
              Send Message
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </motion.button>
          </form>
              )}
            </motion.div>
          </div>
        </motion.section>

        {/* FAQ Section */}
        <motion.section 
          className="py-20"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6">
                Frequently Asked Questions
              </h2>
              <p className="text-lg text-[#171717cc] dark:text-[#fafafacc] max-w-2xl mx-auto">
                Here are some common questions we receive. Don't see your question? Contact us directly!
              </p>
            </motion.div>

            <motion.div 
              className="space-y-6"
              variants={staggerContainer}
              initial="initial"
              whileInView="animate"
              viewport={{ once: true }}
            >
              {faqs.map((faq, index) => (
                <motion.div
                  key={index}
                  variants={fadeInUp}
                  className="bg-white dark:bg-[#171717] p-6 rounded-2xl shadow-lg border border-[#EEEEEE] dark:border-gray-700"
                >
                  <h3 className="text-xl font-bold mb-3 text-[#171717] dark:text-[#fafafacc]">
                    {faq.question}
                  </h3>
                  <p className="text-[#171717cc] dark:text-[#fafafacc] leading-relaxed">
                    {faq.answer}
                  </p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </motion.section>

        {/* CTA Section */}
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
                Ready to Get Started?
              </h2>
              
              <p className="text-xl text-white mb-10 max-w-2xl mx-auto">
                Join thousands of learners who are already transforming their education with EduExtract.
              </p>
              
              <motion.a
                href="/dashboard"
                className="inline-flex items-center gap-3 bg-white text-[#171717] px-8 py-4 rounded-full font-bold text-lg shadow-lg hover:shadow-xl transition-all duration-300"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Users className="w-6 h-6" />
                Start Learning Today
                <ArrowRight className="w-5 h-5" />
              </motion.a>
              
              <p className="text-white text-sm mt-4">
                No credit card required • Free to get started
              </p>
            </motion.div>
        </div>
        </motion.section>
      </div>
    </>
  );
};

export default Contact;

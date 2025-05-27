import React from "react";
import Header from "../components/Header";
const About = () => {
  return (<>
        <Header/>
    <div className="min-h-screen bg-[#FFFFFF] text-[#171717] pt-26 py-16 px-6">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-4xl font-bold mb-6 text-center text-[#171717]">About EduExtract</h1>
        <p className="text-[#171717cc] text-lg text-center mb-12">
          Empowering learners through accessible, high-quality education and technology.
        </p>

        <div className="grid md:grid-cols-2 gap-10 mb-16">
          <div>
            <h2 className="text-2xl font-semibold mb-4 text-[#171717]">Who We Are</h2>
            <p className="text-[#171717cc] leading-relaxed">
              EduExtract is a forward-thinking platform committed to transforming the learning
              experience. We believe in breaking down complex concepts into simple, engaging, and
              digestible content that fuels curiosity and supports lifelong learning.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-4 text-[#171717]">What We Do</h2>
            <p className="text-[#171717cc] leading-relaxed">
              Our team of educators, designers, and developers collaborates to create intuitive
              educational tools, interactive lessons, and personalized learning paths that adapt
              to each user's journey. Whether you're a student, teacher, or lifelong learner —
              we've got something for you.
            </p>
          </div>
        </div>

        {/* Mission and Vision Section */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold mb-8 text-center text-[#171717]">Our Mission & Vision</h2>
          <div className="grid md:grid-cols-2 gap-10">
            <div className="bg-[#FAFAFA] p-6 rounded-lg">
              <h3 className="text-xl font-semibold mb-4 text-[#171717]">Our Mission</h3>
              <p className="text-[#171717cc] leading-relaxed">
                To democratize education by making high-quality learning resources accessible to everyone. 
                We strive to break down barriers to education through innovative technology and personalized 
                learning experiences.
              </p>
            </div>
            <div className="bg-[#FAFAFA] p-6 rounded-lg">
              <h3 className="text-xl font-semibold mb-4 text-[#171717]">Our Vision</h3>
              <p className="text-[#171717cc] leading-relaxed">
                To create a world where anyone can learn anything, anywhere, at any time. We envision 
                a future where education is personalized, engaging, and accessible to all, powered by 
                cutting-edge AI technology.
              </p>
            </div>
          </div>
        </div>

        {/* Core Values Section */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold mb-8 text-center text-[#171717]">Our Core Values</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-[#FAFAFA] p-6 rounded-lg text-center">
              <h3 className="text-xl font-semibold mb-3 text-[#171717]">Innovation</h3>
              <p className="text-[#171717cc]">
                Constantly pushing boundaries to create better learning experiences through technology.
              </p>
            </div>
            <div className="bg-[#FAFAFA] p-6 rounded-lg text-center">
              <h3 className="text-xl font-semibold mb-3 text-[#171717]">Accessibility</h3>
              <p className="text-[#171717cc]">
                Making quality education available to everyone, regardless of their background or location.
              </p>
            </div>
            <div className="bg-[#FAFAFA] p-6 rounded-lg text-center">
              <h3 className="text-xl font-semibold mb-3 text-[#171717]">Excellence</h3>
              <p className="text-[#171717cc]">
                Committed to delivering the highest quality educational content and user experience.
              </p>
            </div>
          </div>
        </div>

        {/* Team Section */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold mb-8 text-center text-[#171717]">Our Team</h2>
          <p className="text-[#171717cc] text-center mb-8 max-w-3xl mx-auto">
            We are a diverse team of passionate educators, technologists, and innovators working together 
            to revolutionize the way people learn. Our collective expertise spans education, artificial 
            intelligence, and user experience design.
          </p>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-[#FAFAFA] p-6 rounded-lg">
              <h3 className="text-xl font-semibold mb-4 text-[#171717]">Education Experts</h3>
              <p className="text-[#171717cc] leading-relaxed">
                Our team includes experienced educators and curriculum designers who ensure that our 
                content is accurate, engaging, and aligned with educational best practices.
              </p>
            </div>
            <div className="bg-[#FAFAFA] p-6 rounded-lg">
              <h3 className="text-xl font-semibold mb-4 text-[#171717]">Tech Innovators</h3>
              <p className="text-[#171717cc] leading-relaxed">
                Our developers and AI specialists work tirelessly to create cutting-edge learning 
                technologies that make education more accessible and effective.
              </p>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="mt-16 bg-[#FAFAFA] rounded-lg p-8 text-center">
          <h3 className="text-xl font-semibold mb-2 text-[#171717]">
            Join us on our mission to revolutionize education.
          </h3>
          <p className="text-[#171717cc] mb-4">
            Learn. Grow. Excel — with EduExtract.
          </p>
          <a
            href="/"
            className="inline-block bg-[#171717] text-white font-medium px-6 py-2 rounded hover:bg-[#121212] transition"
          >
            Go to Home
          </a>
        </div>
      </div>
    </div></>
  );
};

export default About;

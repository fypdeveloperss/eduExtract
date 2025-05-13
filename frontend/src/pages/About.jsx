import React from "react";
import Header from "../components/Header";
const About = () => {
  return (<>
        <Header/>
    <div className="min-h-screen bg-white text-black pt-26 py-16 px-6">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-4xl font-bold mb-6 text-center">About EduExtract</h1>
        <p className="text-zinc-600 text-lg text-center mb-12">
          Empowering learners through accessible, high-quality education and technology.
        </p>

        <div className="grid md:grid-cols-2 gap-10">
          <div>
            <h2 className="text-2xl font-semibold mb-4">Who We Are</h2>
            <p className="text-zinc-700 leading-relaxed">
              EduExtract is a forward-thinking platform committed to transforming the learning
              experience. We believe in breaking down complex concepts into simple, engaging, and
              digestible content that fuels curiosity and supports lifelong learning.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-4">What We Do</h2>
            <p className="text-zinc-700 leading-relaxed">
              Our team of educators, designers, and developers collaborates to create intuitive
              educational tools, interactive lessons, and personalized learning paths that adapt
              to each user’s journey. Whether you're a student, teacher, or lifelong learner —
              we’ve got something for you.
            </p>
          </div>
        </div>

        <div className="mt-16 bg-zinc-100 rounded-lg p-8 text-center">
          <h3 className="text-xl font-semibold mb-2">
            Join us on our mission to revolutionize education.
          </h3>
          <p className="text-zinc-600 mb-4">
            Learn. Grow. Excel — with EduExtract.
          </p>
          <a
            href="/"
            className="inline-block bg-black text-white font-medium px-6 py-2 rounded hover:bg-zinc-800 transition"
          >
            Go to Home
          </a>
        </div>
      </div>
    </div></>
  );
};

export default About;

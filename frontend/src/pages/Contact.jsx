import React, { useState } from "react";
import Header from "../components/Header";

const Contact = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
  });

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
    alert("Message sent! We'll get back to you soon.");
    setFormData({ name: "", email: "", message: "" });
  };

  return (
    <>
      <Header />
      <div className="min-h-screen bg-white text-black pt-26 py-16 px-6">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl font-bold mb-6 text-center">Contact Us</h1>
          <p className="text-zinc-600 text-lg text-center mb-12">
            Have questions, feedback, or just want to say hello? We'd love to hear from you.
          </p>

          <form
            onSubmit={handleSubmit}
            className="bg-zinc-100 p-8 rounded-lg shadow-md space-y-6"
          >
            <div>
              <label className="block text-sm font-medium mb-1 text-zinc-700">Name</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full p-3 rounded-md bg-white border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-zinc-700">Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full p-3 rounded-md bg-white border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-zinc-700">Message</label>
              <textarea
                name="message"
                value={formData.message}
                onChange={handleChange}
                required
                rows={5}
                className="w-full p-3 rounded-md bg-white border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-black"
              ></textarea>
            </div>

            <button
              type="submit"
              className="bg-black text-white px-6 py-3 rounded hover:bg-zinc-800 transition"
            >
              Send Message
            </button>
          </form>
        </div>
      </div>
    </>
  );
};

export default Contact;

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
      <div className="min-h-screen bg-[#FFFFFF] text-[#171717] pt-26 py-16 px-6">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl font-bold mb-6 text-center text-[#171717]">Contact Us</h1>
          <p className="text-[#171717cc] text-lg text-center mb-12">
            Have questions, feedback, or just want to say hello? We'd love to hear from you.
          </p>

          <form
            onSubmit={handleSubmit}
            className="bg-[#FAFAFA] p-8 rounded-lg shadow-md space-y-6"
          >
            <div>
              <label className="block text-sm font-medium mb-1 text-[#171717cc]">Name</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full p-3 rounded-md bg-white border border-[#EEEEEE] focus:outline-none focus:ring-2 focus:ring-[#171717]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-[#171717cc]">Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full p-3 rounded-md bg-white border border-[#EEEEEE] focus:outline-none focus:ring-2 focus:ring-[#171717]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-[#171717cc]">Message</label>
              <textarea
                name="message"
                value={formData.message}
                onChange={handleChange}
                required
                rows={5}
                className="w-full p-3 rounded-md bg-white border border-[#EEEEEE] focus:outline-none focus:ring-2 focus:ring-[#171717]"
              ></textarea>
            </div>

            <button
              type="submit"
              className="bg-[#171717] text-white px-6 py-3 rounded hover:bg-[#121212] transition"
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

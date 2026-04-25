import { Shield, ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import SEO from '@/components/SEO'

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-[#fcfafb] py-20 px-4">
      <SEO 
        title="Privacy Policy"
        description="Privacy policy for GEB Surrogacy Services. Learn how we handle and protect your personal information."
      />
      <div className="max-w-4xl mx-auto">
        <Link to="/" className="inline-flex items-center gap-2 text-[#f8a4b9] font-semibold mb-8 hover:underline">
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>
        
        <div className="bg-white rounded-[2rem] p-8 md:p-12 shadow-sm border border-[#f0e7ec]">
          <div className="w-16 h-16 bg-[#ffeef2] rounded-2xl flex items-center justify-center mb-8">
            <Shield className="w-8 h-8 text-[#f8a4b9]" />
          </div>
          
          <h1 className="text-4xl font-serif font-bold text-[#2d2d2d] mb-6">Privacy Policy</h1>
          <p className="text-gray-500 mb-8 font-medium italic text-sm">Last Updated: April 24, 2026</p>
          
          <div className="prose prose-pink max-w-none text-[#666666] space-y-6">
            <section>
              <h2 className="text-2xl font-serif font-bold text-[#2d2d2d] mb-4">1. Introduction</h2>
              <p>
                At GEB Surrogacy Services, we take your privacy seriously. This Privacy Policy explains how we collect, use, and protect your personal information when you use our website and services.
              </p>
            </section>
            
            <section>
              <h2 className="text-2xl font-serif font-bold text-[#2d2d2d] mb-4">2. Information We Collect</h2>
              <p>
                We collect information that you provide directly to us when you book a consultation, subscribe to our newsletter, or contact us through our website. This may include:
              </p>
              <ul className="list-disc pl-6 mt-4 space-y-2">
                <li>Name and contact information (email, phone number)</li>
                <li>Health-related information relevant to surrogacy services</li>
                <li>Payment information for consultation fees</li>
                <li>Communications with our team</li>
              </ul>
            </section>
            
            <section>
              <h2 className="text-2xl font-serif font-bold text-[#2d2d2d] mb-4">3. How We Use Your Information</h2>
              <p>
                Your information is used to provide and improve our services, including:
              </p>
              <ul className="list-disc pl-6 mt-4 space-y-2">
                <li>Processing your consultation bookings</li>
                <li>Providing personalized guidance on your surrogacy journey</li>
                <li>Communicating updates, newsletters, and marketing materials (you can opt-out at any time)</li>
                <li>Ensuring legal and medical compliance in the surrogacy process</li>
              </ul>
            </section>
            
            <section>
              <h2 className="text-2xl font-serif font-bold text-[#2d2d2d] mb-4">4. Data Security</h2>
              <p>
                We implement robust security measures to protect your data from unauthorized access, alteration, or disclosure. However, no method of transmission over the internet is 100% secure.
              </p>
            <div className="bg-gray-50 rounded-2xl p-8 border border-gray-100">
              <h2 className="text-2xl font-serif font-bold text-gray-900 mb-4">Contact Us</h2>
              <p className="text-gray-600 mb-4">
                If you have any questions about this Privacy Policy, please contact us at gebheritagagency@gmail.com.
              </p>
              <div className="space-y-2 text-gray-600">
                <p className="font-bold text-gray-900">GEB Surrogacy Services</p>
                <p>Block D5 Flat 36 CBN Estate 2, Satellite Town Lagos Nigeria</p>
                <p>Leeds, UK</p>
                <p>California, USA</p>
              </div>
            </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PrivacyPolicy

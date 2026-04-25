
import { FileText, ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import SEO from '@/components/SEO'

const TermsOfService = () => {
  return (
    <div className="min-h-screen bg-[#fcfafb] py-20 px-4">
      <SEO 
        title="Terms of Service"
        description="Terms of service for GEB Surrogacy Services. Please read these terms carefully before using our services."
      />
      <div className="max-w-4xl mx-auto">
        <Link to="/" className="inline-flex items-center gap-2 text-[#f8a4b9] font-semibold mb-8 hover:underline">
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>
        
        <div className="bg-white rounded-[2rem] p-8 md:p-12 shadow-sm border border-[#f0e7ec]">
          <div className="w-16 h-16 bg-[#ffeef2] rounded-2xl flex items-center justify-center mb-8">
            <FileText className="w-8 h-8 text-[#f8a4b9]" />
          </div>
          
          <h1 className="text-4xl font-serif font-bold text-[#2d2d2d] mb-6">Terms of Service</h1>
          <p className="text-gray-500 mb-8 font-medium italic text-sm">Last Updated: April 24, 2026</p>
          
          <div className="prose prose-pink max-w-none text-[#666666] space-y-6">
            <section>
              <h2 className="text-2xl font-serif font-bold text-[#2d2d2d] mb-4">1. Acceptance of Terms</h2>
              <p>
                By accessing and using the website of GEB Surrogacy Services, you agree to be bound by these Terms of Service and all applicable laws and regulations.
              </p>
            </section>
            
            <section>
              <h2 className="text-2xl font-serif font-bold text-[#2d2d2d] mb-4">2. Services Provided</h2>
              <p>
                GEB Surrogacy Services provides information and coordination services related to surrogacy, egg donation, and fertility treatments. We are an agency, not a medical or legal provider. All medical and legal services are provided by third-party professionals.
              </p>
            </section>
            
            <section>
              <h2 className="text-2xl font-serif font-bold text-[#2d2d2d] mb-4">3. Consultation Fees</h2>
              <p>
                Consultation bookings require a fee of $100. This fee is non-refundable but may be credited toward your agency fee if you proceed with our services.
              </p>
            </section>
            
            <section>
              <h2 className="text-2xl font-serif font-bold text-[#2d2d2d] mb-4">4. Limitation of Liability</h2>
              <p>
                GEB Surrogacy Services is not responsible for any medical outcomes or legal disputes arising from surrogacy arrangements. We facilitate connections and provide guidance based on our experience.
              </p>
            </section>
            
            <section>
              <h2 className="text-2xl font-serif font-bold text-[#2d2d2d] mb-4">5. Intellectual Property</h2>
              <p>
                All content on this website, including text, graphics, and logos, is the property of GEB Surrogacy Services and protected by international copyright laws.
              </p>
            </section>
            
            <section>
              <h2 className="text-2xl font-serif font-bold text-[#2d2d2d] mb-4">6. Governing Law</h2>
              <p>
                These terms shall be governed by and construed in accordance with the laws of the Federal Republic of Nigeria, the United Kingdom, and the United States, as applicable to the location of service.
              </p>
            </section>

            <div className="bg-gray-50 rounded-2xl p-8 border border-gray-100 mt-12">
              <h2 className="text-2xl font-serif font-bold text-gray-900 mb-4">Contact Us</h2>
              <p className="text-gray-600 mb-4">
                If you have any questions about these Terms, please contact us at gebheritagagency@gmail.com.
              </p>
              <div className="space-y-2 text-gray-600">
                <p className="font-bold text-gray-900">GEB Surrogacy Services</p>
                <p>Block D5 Flat 36 CBN Estate 2, Satellite Town Lagos Nigeria</p>
                <p>Leeds, UK</p>
                <p>California, USA</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TermsOfService

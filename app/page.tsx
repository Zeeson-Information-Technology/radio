import Link from "next/link";

export default function HomePage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-16">
      <div className="text-center">
        <h1 className="text-5xl font-bold text-gray-900 mb-4">
          Islamic Radio
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Listen to live Islamic lectures and recorded content
        </p>
        <div className="flex justify-center gap-4">
          <Link
            href="/radio"
            className="bg-green-600 text-white px-8 py-3 rounded-lg hover:bg-green-700 transition-colors text-lg font-medium"
          >
            Listen Now
          </Link>
        </div>
      </div>

      <div className="mt-16 grid md:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h2 className="text-2xl font-semibold text-gray-900 mb-3">
            Live Lectures
          </h2>
          <p className="text-gray-600">
            Join us for live Islamic lectures from knowledgeable scholars. 
            Check the radio page to see if we&apos;re currently broadcasting.
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h2 className="text-2xl font-semibold text-gray-900 mb-3">
            Recorded Content
          </h2>
          <p className="text-gray-600">
            When we&apos;re not live, enjoy our collection of recorded lectures 
            and Islamic content available 24/7.
          </p>
        </div>
      </div>
    </div>
  );
}

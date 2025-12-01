'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { MdArrowBack, MdPlayCircle, MdOpenInNew, MdClose, MdAccessTime, MdSchool } from 'react-icons/md';

// ============================================================================
// VIDEO DATA - Edit this section to add your lectures
// ============================================================================

interface Lecture {
  id: string;
  title: string;
  description: string;
  panoptoId: string; // The ID from your Panopto video URL
  duration: string;  // Format: "MM:SS" or "HH:MM:SS"
  topic?: string;    // Optional topic/unit label
}

interface Course {
  id: string;
  code: string;
  title: string;
  description: string;
  lectures: Lecture[];
}

// Your Panopto institution subdomain (e.g., "fsu" for fsu.hosted.panopto.com)
const PANOPTO_SUBDOMAIN = 'mdc'; // <-- EDIT THIS

const COURSES: Course[] = [
  {
    id: 'mac2313',
    code: 'MAC2313',
    title: 'Calculus 3',
    description: 'Multivariable calculus, vectors, partial derivatives, multiple integrals, and vector calculus.',
    lectures: [
      {
        id: 'normal-1',
        title: 'Tangent Planes and Extrema',
        description: 'Introduction to using tangent planes to approximate surfaces and find local extrema.',
        panoptoId: 'a25e5256-e9fd-419c-9508-b199014a66d2', // <-- EDIT THIS
        duration: '1:25:11',
        topic: 'Unit 1: Vectors',
      },
      {
        id: 'multivariable-1',
        title: 'Lecture 2: Double Integrals',
        description: 'Double integrals over rectangular and general regions.',
        panoptoId: 'e885d771-bdc0-42f0-b406-b1a1000659d3', // <-- EDIT THIS
        duration: '1:54:28',
        topic: 'Unit 2: Multivariable',
      },
      {
        id: 'multivariable-2',
        title: 'Lecture 3: Polar Coordinates',
        description: 'Using polar coordinates in double integrals and area calculations.',
        panoptoId: '25caf250-2b54-4f70-8858-b1a201752f16', // <-- EDIT THIS
        duration: '45:22',
        topic: 'Unit 2: Multivariable',
      },
      {
        id: 'multivariable-3',
        title: 'Lecture 4: Triple Integrals Spherical Coordinates',
        description: 'Triple integrals in spherical coordinates and applications.',
        panoptoId: '79505e72-22f5-44ac-a9d5-b1a7018a8161', // <-- EDIT THIS
        duration: '1:55:25',
        topic: 'Unit 2: Multivariable',
      },
    ],
  },
  // Add more courses here in the future:
  // {
  //   id: 'mac2312',
  //   code: 'MAC2312',
  //   title: 'Calculus 2',
  //   description: 'Integration techniques, sequences, series, and applications.',
  //   lectures: [...],
  // },
];

// ============================================================================
// COMPONENT CODE - No need to edit below unless customizing
// ============================================================================

// Video Modal Component
function VideoModal({
  lecture,
  onClose,
}: {
  lecture: Lecture;
  onClose: () => void;
}) {
  // Disable Panopto's built-in title to avoid overlap with our footer
  const panoptoUrl = `https://${PANOPTO_SUBDOMAIN}.hosted.panopto.com/Panopto/Pages/Embed.aspx?id=${lecture.panoptoId}&autoplay=true&offerviewer=false&showtitle=false&showbrand=false&interactivity=all`;
  const directUrl = `https://${PANOPTO_SUBDOMAIN}.hosted.panopto.com/Panopto/Pages/Viewer.aspx?id=${lecture.panoptoId}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative w-full max-w-5xl rounded-xl overflow-hidden flex flex-col"
        style={{
          background: 'rgba(15, 23, 42, 0.95)',
          border: '1px solid rgba(100, 116, 139, 0.3)',
          boxShadow: '0 25px 50px rgba(0, 0, 0, 0.5)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button - top left corner */}
        <button
          onClick={onClose}
          className="absolute top-3 left-3 z-10 w-8 h-8 flex items-center justify-center rounded-lg bg-black/50 text-slate-400 hover:text-white hover:bg-black/70 transition"
        >
          <MdClose className="w-5 h-5" />
        </button>

        {/* Video Player Container */}
        <div className="relative w-full aspect-video bg-black">
          <iframe
            src={panoptoUrl}
            className="absolute inset-0 w-full h-full"
            frameBorder="0"
            allowFullScreen
            allow="autoplay"
          />
        </div>

        {/* Footer - Completely separate from video, with its own background */}
        <div className="flex items-center justify-between px-4 py-3 bg-slate-900/95 border-t border-slate-700/40">
          <div className="flex-1 min-w-0 pr-4">
            <h2 className="text-white font-semibold truncate">{lecture.title}</h2>
            <p className="text-slate-400 text-sm truncate">{lecture.description}</p>
          </div>
          <a
            href={directUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/60 text-slate-400 hover:text-white hover:bg-slate-700 transition text-sm"
          >
            <MdOpenInNew className="w-4 h-4" />
            <span>Open in Panopto</span>
          </a>
        </div>
      </div>
    </div>
  );
}

// Video Card Component
function LectureCard({
  lecture,
  onClick,
}: {
  lecture: Lecture;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group relative w-full text-left rounded-xl overflow-hidden transition-all duration-300 hover:scale-[1.02]"
      style={{
        background: 'rgba(15, 23, 42, 0.8)',
        border: '1px solid rgba(100, 116, 139, 0.2)',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
      }}
    >
      {/* Hover glow effect */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl"
        style={{
          boxShadow: 'inset 0 0 30px rgba(34, 211, 238, 0.1), 0 0 30px rgba(34, 211, 238, 0.1)',
        }}
      />

      {/* Thumbnail placeholder */}
      <div className="relative aspect-video bg-linear-to-br from-slate-800 to-slate-900 flex items-center justify-center overflow-hidden">
        {/* Math grid pattern */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `
              linear-gradient(rgba(34, 211, 238, 0.3) 1px, transparent 1px),
              linear-gradient(90deg, rgba(34, 211, 238, 0.3) 1px, transparent 1px)
            `,
            backgroundSize: '20px 20px',
          }}
        />
        
        {/* Play icon */}
        <MdPlayCircle className="w-16 h-16 text-cyan-400/70 group-hover:text-cyan-400 group-hover:scale-110 transition-all duration-300 z-10" />

        {/* Duration badge */}
        <div className="absolute bottom-2 right-2 flex items-center gap-1 px-2 py-1 rounded bg-black/70 text-white text-xs font-mono">
          <MdAccessTime className="w-3 h-3" />
          {lecture.duration}
        </div>

        {/* Topic badge */}
        {lecture.topic && (
          <div className="absolute top-2 left-2 px-2 py-1 rounded bg-cyan-500/20 text-cyan-400 text-xs font-medium">
            {lecture.topic}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="text-white font-medium text-sm group-hover:text-cyan-400 transition-colors line-clamp-2">
          {lecture.title}
        </h3>
        <p className="text-slate-500 text-xs mt-1 line-clamp-2">
          {lecture.description}
        </p>
      </div>
    </button>
  );
}

// Course Section Component
function CourseSection({ course }: { course: Course }) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="mb-8">
      {/* Course Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-4 p-4 rounded-xl transition-all hover:bg-slate-800/30"
        style={{
          background: 'rgba(15, 23, 42, 0.6)',
          border: '1px solid rgba(100, 116, 139, 0.2)',
        }}
      >
        <div className="w-12 h-12 rounded-lg bg-linear-to-br from-cyan-500 to-purple-600 flex items-center justify-center">
          <MdSchool className="w-6 h-6 text-white" />
        </div>
        <div className="flex-1 text-left">
          <div className="flex items-center gap-2">
            <span className="text-cyan-400 font-mono text-sm">{course.code}</span>
            <span className="text-slate-500">•</span>
            <span className="text-white font-semibold">{course.title}</span>
          </div>
          <p className="text-slate-400 text-sm">{course.description}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-500 text-sm">{course.lectures.length} lectures</span>
          <svg
            className={`w-5 h-5 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Lectures Grid */}
      {isExpanded && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-4 pl-4">
          {course.lectures.map((lecture) => (
            <LectureCardWrapper key={lecture.id} lecture={lecture} />
          ))}
        </div>
      )}
    </div>
  );
}

// Wrapper to handle modal state
function LectureCardWrapper({ lecture }: { lecture: Lecture }) {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <LectureCard lecture={lecture} onClick={() => setShowModal(true)} />
      {showModal && <VideoModal lecture={lecture} onClose={() => setShowModal(false)} />}
    </>
  );
}

// Main Page Component
export default function LecturesPage() {
  return (
    <div className="min-h-screen relative bg-[#030712] overflow-hidden">
      {/* Mathematical background pattern */}
      <div className="fixed inset-0 pointer-events-none">
        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(34, 211, 238, 1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(34, 211, 238, 1) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px',
          }}
        />
        {/* Subtle radial gradient */}
        <div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse at 50% 0%, rgba(34, 211, 238, 0.05) 0%, transparent 50%)',
          }}
        />
        {/* Corner accents */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative border-b border-slate-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link
              href="/"
              className="group flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 hover:bg-slate-800/50"
            >
              <MdArrowBack className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors" />
              <span className="text-sm text-slate-400 group-hover:text-white transition-colors">Back</span>
            </Link>

            <h1 className="text-lg font-semibold text-white flex items-center gap-2">
              <span className="text-2xl">📚</span>
              Video Lectures
            </h1>

            <div className="w-24" /> {/* Spacer for centering */}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-white mb-4">
            Course Video Lectures
          </h2>
          <p className="text-slate-400 max-w-2xl mx-auto">
            Browse and watch recorded lectures organized by course. Click any lecture to watch in the modal player, 
            or open directly in Panopto for the full experience.
          </p>
        </div>

        {/* Course Sections */}
        {COURSES.map((course) => (
          <CourseSection key={course.id} course={course} />
        ))}

        {/* Empty state if no courses */}
        {COURSES.length === 0 && (
          <div className="text-center py-20">
            <MdSchool className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-400 mb-2">No Courses Yet</h3>
            <p className="text-slate-500">Video lectures will appear here once added.</p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="relative border-t border-slate-800/50 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between text-sm text-slate-500">
            <p>
              Video content provided for educational purposes.
            </p>
            <p>
              MIT License
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

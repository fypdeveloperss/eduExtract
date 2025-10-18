import React, { useState, useEffect } from 'react';
import { useOnboarding } from '../context/OnboardingContext';
import { usePreferences } from '../context/PreferencesContext';
import { X, ArrowRight, ArrowLeft, Check, User, Settings, BookOpen, Sparkles, GraduationCap, Brain } from 'lucide-react';

// Add CSS keyframes for animations
const animationKeyframes = `
  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
  
  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  @keyframes scaleIn {
    from {
      opacity: 0;
      transform: scale(0.9);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }
  
  @keyframes float {
    0%, 100% {
      transform: translateY(0px);
    }
    50% {
      transform: translateY(-10px);
    }
  }
  
  @keyframes shimmer {
    0% {
      background-position: -1000px 0;
    }
    100% {
      background-position: 1000px 0;
    }
  }
  
  .animate-fadeIn {
    animation: fadeIn 0.5s ease-out forwards;
  }
  
  .animate-slideUp {
    animation: slideUp 0.6s ease-out forwards;
  }
  
  .animate-scaleIn {
    animation: scaleIn 0.4s ease-out forwards;
  }
  
  .animate-float {
    animation: float 3s ease-in-out infinite;
  }
  
  .shimmer {
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
    background-size: 200% 100%;
    animation: shimmer 2s infinite;
  }
`;

// Inject the CSS
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = animationKeyframes;
  document.head.appendChild(style);
}

const OnboardingModal = () => {
  const { isOnboarding, onboardingStep, setOnboardingStep, completeOnboarding, skipOnboarding } = useOnboarding();
  const { updatePreferences } = usePreferences();
  
  console.log('OnboardingModal component rendered with isOnboarding:', isOnboarding);
  const [coursesInput, setCoursesInput] = useState('');
  const [localPreferences, setLocalPreferences] = useState({
    contentPreferences: {
      quizFormat: 'multiple-choice',
      summaryLength: 'medium',
      flashcardStyle: 'simple',
      presentationSlides: 10
    },
    tonePreferences: {
      communicationStyle: 'academic',
      complexityLevel: 'intermediate',
      languageStyle: 'formal'
    },
    learningBehavior: {
      preferredLearningTime: 'anytime',
      studySessionLength: 30,
      difficultyProgression: 'moderate'
    },
    contentCustomization: {
      includeExamples: true,
      includeVisuals: true,
      includeReferences: false,
      personalizedExamples: false
    },
    studyProfile: {
      purpose: '',
      school: '',
      courses: []
    }
  });
  const [saving, setSaving] = useState(false);

  // Initialize coursesInput with existing courses data
  useEffect(() => {
    if (localPreferences.studyProfile?.courses) {
      setCoursesInput(localPreferences.studyProfile.courses.join(', '));
    }
  }, [localPreferences.studyProfile?.courses]);

  const steps = [
    {
      title: "Welcome to EduExtract!",
      description: "Let's personalize your learning experience",
      icon: Sparkles,
      content: (
        <div className="text-center py-12 animate-slideUp">
          <div className="relative mb-6">
            <div className="w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-[#fafafa1a] dark:to-[#fafafa2a] rounded-3xl flex items-center justify-center mx-auto shadow-2xl animate-float">
              <GraduationCap className="w-12 h-12 text-gray-800 dark:text-[#fafafa]" />
            </div>
            <div className="absolute -top-2 -right-2 w-8 h-8 bg-gray-900 dark:bg-[#fafafa] rounded-full flex items-center justify-center shadow-lg">
              <Sparkles className="w-4 h-4 text-white dark:text-[#171717]" />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-[#fafafa] mb-3">
            Get Started with AI-Powered Learning
          </h3>
          <p className="text-gray-600 dark:text-[#fafafacc] text-lg max-w-md mx-auto leading-relaxed">
            Transform your learning journey with personalized AI-generated content tailored just for you
          </p>
          <div className="mt-8 flex items-center justify-center gap-4">
            <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-[#fafafa1a] rounded-full">
              <Check className="w-4 h-4 text-gray-700 dark:text-[#fafafa]" />
              <span className="text-sm text-gray-700 dark:text-[#fafafacc]">Smart Summaries</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-[#fafafa1a] rounded-full">
              <Check className="w-4 h-4 text-gray-700 dark:text-[#fafafa]" />
              <span className="text-sm text-gray-700 dark:text-[#fafafacc]">Interactive Quizzes</span>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "Your Study Profile",
      description: "Tell us about your purpose, school, and courses",
      icon: User,
      content: (
        <div className="space-y-5 animate-slideUp">
          <div className="grid grid-cols-1 gap-5">
            <div className="group">
              <label className="block text-sm font-semibold text-gray-700 dark:text-[#fafafacc] mb-2.5">
                Purpose
              </label>
              <select
                value={localPreferences.studyProfile.purpose}
                onChange={(e) => setLocalPreferences({
                  ...localPreferences,
                  studyProfile: {
                    ...localPreferences.studyProfile,
                    purpose: e.target.value
                  }
                })}
                className="w-full p-3.5 border-2 border-gray-200 dark:border-[#fafafa1a] rounded-xl bg-white dark:bg-[#1E1E1E] text-gray-900 dark:text-[#fafafa] focus:ring-2 focus:ring-gray-400 dark:focus:ring-[#fafafa2a] focus:border-transparent transition-all duration-200 hover:border-gray-300 dark:hover:border-[#fafafa2a] shadow-sm"
              >
                <option value="">Select your purpose</option>
                <option value="Study">Study</option>
                <option value="Research">Research</option>
                <option value="Teaching">Teaching</option>
                <option value="Revision">Revision</option>
              </select>
            </div>

            <div className="group">
              <label className="block text-sm font-semibold text-gray-700 dark:text-[#fafafacc] mb-2.5">
                School / University
              </label>
              <input
                type="text"
                value={localPreferences.studyProfile.school}
                onChange={(e) => setLocalPreferences({
                  ...localPreferences,
                  studyProfile: {
                    ...localPreferences.studyProfile,
                    school: e.target.value
                  }
                })}
                placeholder="e.g., COMSATS University Islamabad"
                className="w-full p-3.5 border-2 border-gray-200 dark:border-[#fafafa1a] rounded-xl bg-white dark:bg-[#1E1E1E] text-gray-900 dark:text-[#fafafa] focus:ring-2 focus:ring-gray-400 dark:focus:ring-[#fafafa2a] focus:border-transparent transition-all duration-200 hover:border-gray-300 dark:hover:border-[#fafafa2a] shadow-sm placeholder:text-gray-400 dark:placeholder:text-[#fafafa66]"
              />
            </div>

            <div className="group">
              <label className="block text-sm font-semibold text-gray-700 dark:text-[#fafafacc] mb-2.5">
                Courses
              </label>
              <input
                type="text"
                value={coursesInput}
                onChange={(e) => setCoursesInput(e.target.value)}
                placeholder="e.g., Computer Science, Data Structures"
                className="w-full p-3.5 border-2 border-gray-200 dark:border-[#fafafa1a] rounded-xl bg-white dark:bg-[#1E1E1E] text-gray-900 dark:text-[#fafafa] focus:ring-2 focus:ring-gray-400 dark:focus:ring-[#fafafa2a] focus:border-transparent transition-all duration-200 hover:border-gray-300 dark:hover:border-[#fafafa2a] shadow-sm placeholder:text-gray-400 dark:placeholder:text-[#fafafa66]"
              />
              <p className="mt-2 text-xs text-gray-500 dark:text-[#fafafa99] flex items-center gap-1">
                <span className="w-1 h-1 bg-gray-400 dark:bg-[#fafafa66] rounded-full"></span>
                Enter comma-separated course names
              </p>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "Learning Preferences",
      description: "Customize how AI generates content for you",
      icon: Brain,
      content: (
        <div className="space-y-5 animate-slideUp">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-[#fafafacc] mb-2.5">
              Communication Style
            </label>
            <select
              value={localPreferences.tonePreferences.communicationStyle}
              onChange={(e) => setLocalPreferences({
                ...localPreferences,
                tonePreferences: {
                  ...localPreferences.tonePreferences,
                  communicationStyle: e.target.value
                }
              })}
              className="w-full p-3.5 border-2 border-gray-200 dark:border-[#fafafa1a] rounded-xl bg-white dark:bg-[#1E1E1E] text-gray-900 dark:text-[#fafafa] focus:ring-2 focus:ring-gray-400 dark:focus:ring-[#fafafa2a] focus:border-transparent transition-all duration-200 hover:border-gray-300 dark:hover:border-[#fafafa2a] shadow-sm"
            >
              <option value="academic">Academic</option>
              <option value="casual">Casual</option>
              <option value="professional">Professional</option>
              <option value="friendly">Friendly</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-[#fafafacc] mb-2.5">
              Quiz Format Preference
            </label>
            <select
              value={localPreferences.contentPreferences.quizFormat}
              onChange={(e) => setLocalPreferences({
                ...localPreferences,
                contentPreferences: {
                  ...localPreferences.contentPreferences,
                  quizFormat: e.target.value
                }
              })}
              className="w-full p-3.5 border-2 border-gray-200 dark:border-[#fafafa1a] rounded-xl bg-white dark:bg-[#1E1E1E] text-gray-900 dark:text-[#fafafa] focus:ring-2 focus:ring-gray-400 dark:focus:ring-[#fafafa2a] focus:border-transparent transition-all duration-200 hover:border-gray-300 dark:hover:border-[#fafafa2a] shadow-sm"
            >
              <option value="multiple-choice">Multiple Choice</option>
              <option value="true-false">True/False</option>
              <option value="fill-blank">Fill in the Blank</option>
              <option value="mixed">Mixed Format</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-[#fafafacc] mb-2.5">
              Summary Length
            </label>
            <select
              value={localPreferences.contentPreferences.summaryLength}
              onChange={(e) => setLocalPreferences({
                ...localPreferences,
                contentPreferences: {
                  ...localPreferences.contentPreferences,
                  summaryLength: e.target.value
                }
              })}
              className="w-full p-3.5 border-2 border-gray-200 dark:border-[#fafafa1a] rounded-xl bg-white dark:bg-[#1E1E1E] text-gray-900 dark:text-[#fafafa] focus:ring-2 focus:ring-gray-400 dark:focus:ring-[#fafafa2a] focus:border-transparent transition-all duration-200 hover:border-gray-300 dark:hover:border-[#fafafa2a] shadow-sm"
            >
              <option value="brief">Brief (1-2 paragraphs)</option>
              <option value="medium">Medium (3-5 paragraphs)</option>
              <option value="detailed">Detailed (6+ paragraphs)</option>
            </select>
          </div>
        </div>
      )
    }
  ];

  const handleNext = async () => {
    if (onboardingStep === steps.length - 1) {
      // Save preferences and complete onboarding
      setSaving(true);
      try {
        const payload = {
          ...localPreferences,
          studyProfile: {
            ...localPreferences.studyProfile,
            courses: coursesInput
              .split(',')
              .map(s => s.trim())
              .filter(Boolean)
          }
        };
        await updatePreferences(payload);
        await completeOnboarding();
      } catch (error) {
        console.error('Failed to save preferences:', error);
      } finally {
        setSaving(false);
      }
    } else {
      setOnboardingStep(onboardingStep + 1);
    }
  };

  const handleSkip = async () => {
    await skipOnboarding();
  };

  const handleBack = () => {
    if (onboardingStep > 0) {
      setOnboardingStep(onboardingStep - 1);
    }
  };

  console.log('OnboardingModal render - isOnboarding:', isOnboarding, 'onboardingStep:', onboardingStep);
  
  if (!isOnboarding) return null;

  const CurrentIcon = steps[onboardingStep].icon;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="bg-white dark:bg-[#171717] rounded-3xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto border border-gray-100 dark:border-[#fafafa1a] animate-scaleIn">
        <div className="p-8">
          {/* Header with Icon */}
          <div className="flex items-start justify-between mb-8">
            <div className="flex items-start gap-4 flex-1">
              <div className="w-12 h-12 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-[#fafafa1a] dark:to-[#fafafa2a] rounded-2xl flex items-center justify-center shadow-lg">
                <CurrentIcon className="w-6 h-6 text-gray-800 dark:text-[#fafafa]" />
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-[#fafafa] mb-1">
                  {steps[onboardingStep].title}
                </h2>
                <p className="text-sm text-gray-600 dark:text-[#fafafa99]">
                  {steps[onboardingStep].description}
                </p>
              </div>
            </div>
            <button
              onClick={handleSkip}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#fafafa1a] rounded-xl transition-all duration-200"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex items-center gap-2">
              {steps.map((step, index) => {
                const StepIcon = step.icon;
                return (
                  <div key={index} className="flex-1">
                    <div className={`h-1.5 rounded-full transition-all duration-500 ${
                      index <= onboardingStep 
                        ? 'bg-gradient-to-r from-gray-700 to-gray-900 dark:from-[#fafafa] dark:to-[#fafafacc]' 
                        : 'bg-gray-200 dark:bg-[#fafafa1a]'
                    }`} />
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-between mt-3">
              <p className="text-xs font-medium text-gray-500 dark:text-[#fafafa99]">
                Step {onboardingStep + 1} of {steps.length}
              </p>
              <p className="text-xs text-gray-400 dark:text-[#fafafa66]">
                {Math.round(((onboardingStep + 1) / steps.length) * 100)}% Complete
              </p>
            </div>
          </div>

          {/* Content */}
          <div className="mb-8">
            {steps[onboardingStep].content}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between gap-4 pt-6 border-t border-gray-100 dark:border-[#fafafa1a]">
            <div className="flex items-center gap-3">
              {/* Back Button - Only show if not on first step */}
              {onboardingStep > 0 && (
                <button
                  onClick={handleBack}
                  className="px-4 py-2.5 text-sm font-medium text-gray-600 dark:text-[#fafafacc] hover:text-gray-900 dark:hover:text-[#fafafa] hover:bg-gray-100 dark:hover:bg-[#fafafa1a] rounded-xl transition-all duration-200 flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>
              )}
              {/* Skip Button */}
              <button
                onClick={handleSkip}
                className="px-4 py-2.5 text-sm font-medium text-gray-600 dark:text-[#fafafacc] hover:text-gray-900 dark:hover:text-[#fafafa] hover:bg-gray-100 dark:hover:bg-[#fafafa1a] rounded-xl transition-all duration-200"
              >
                Skip for now
              </button>
            </div>
            {/* Next/Complete Button */}
            <button
              onClick={handleNext}
              disabled={saving}
              className="px-6 py-3 bg-gradient-to-r from-gray-800 to-gray-900 dark:from-[#fafafa] dark:to-[#fafafacc] text-white dark:text-[#171717] rounded-xl hover:from-gray-900 hover:to-black dark:hover:from-[#fafafacc] dark:hover:to-[#fafafa99] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2 font-medium shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white dark:border-[#171717] border-t-transparent"></div>
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <span>{onboardingStep === steps.length - 1 ? 'Complete Setup' : 'Continue'}</span>
                  {onboardingStep === steps.length - 1 ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <ArrowRight className="w-4 h-4" />
                  )}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingModal;

import React, { useState, useEffect } from 'react';
import { useOnboarding } from '../context/OnboardingContext';
import { usePreferences } from '../context/PreferencesContext';
import { X, ArrowRight, Check, User, Settings, BookOpen } from 'lucide-react';

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
      content: (
        <div className="text-center py-8 transition-all duration-300 ease-out">
          <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
            <BookOpen className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-[#fafafa] mb-2">
            Get Started with AI-Powered Learning
          </h3>
          <p className="text-gray-600 dark:text-[#fafafacc]">
            We'll help you set up your preferences for the best learning experience
          </p>
        </div>
      )
    },
    {
      title: "Your Study Profile",
      description: "Tell us about your purpose, school, and courses",
      content: (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-[#fafafacc] mb-2">
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
                className="w-full p-3 border border-gray-300 dark:border-[#2E2E2E] rounded-lg bg-white dark:bg-[#171717] text-gray-900 dark:text-[#fafafa] focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select purpose</option>
                <option value="Study">Study</option>
                <option value="Research">Research</option>
                <option value="Teaching">Teaching</option>
                <option value="Revision">Revision</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-[#fafafacc] mb-2">
                School
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
                placeholder="e.g., COMSATS University Islamabad (CUI)"
                className="w-full p-3 border border-gray-300 dark:border-[#2E2E2E] rounded-lg bg-white dark:bg-[#171717] text-gray-900 dark:text-[#fafafa] focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-[#fafafacc] mb-2">
                Courses
              </label>
              <input
                type="text"
                value={coursesInput}
                onChange={(e) => setCoursesInput(e.target.value)}
                placeholder="e.g., Computer Science, Data Structures"
                className="w-full p-3 border border-gray-300 dark:border-[#2E2E2E] rounded-lg bg-white dark:bg-[#171717] text-gray-900 dark:text-[#fafafa] focus:ring-2 focus:ring-blue-500"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-[#fafafacc]">Enter comma-separated course names</p>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "Set Your Learning Preferences",
      description: "Customize how AI generates content for you",
      content: (
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-[#fafafacc] mb-2">
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
              className="w-full p-3 border border-gray-300 dark:border-[#2E2E2E] rounded-lg bg-white dark:bg-[#171717] text-gray-900 dark:text-[#fafafa] focus:ring-2 focus:ring-blue-500"
            >
              <option value="academic">Academic</option>
              <option value="casual">Casual</option>
              <option value="professional">Professional</option>
              <option value="friendly">Friendly</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-[#fafafacc] mb-2">
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
              className="w-full p-3 border border-gray-300 dark:border-[#2E2E2E] rounded-lg bg-white dark:bg-[#171717] text-gray-900 dark:text-[#fafafa] focus:ring-2 focus:ring-blue-500"
            >
              <option value="multiple-choice">Multiple Choice</option>
              <option value="true-false">True/False</option>
              <option value="fill-blank">Fill in the Blank</option>
              <option value="mixed">Mixed Format</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-[#fafafacc] mb-2">
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
              className="w-full p-3 border border-gray-300 dark:border-[#2E2E2E] rounded-lg bg-white dark:bg-[#171717] text-gray-900 dark:text-[#fafafa] focus:ring-2 focus:ring-blue-500"
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

  console.log('OnboardingModal render - isOnboarding:', isOnboarding, 'onboardingStep:', onboardingStep);
  
  if (!isOnboarding) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity">
      <div className="bg-white dark:bg-[#171717] rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto transform transition-all duration-300 ease-out scale-100">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-[#fafafa]">
                {steps[onboardingStep].title}
              </h2>
              <p className="text-sm text-gray-500 dark:text-[#fafafacc]">
                {steps[onboardingStep].description}
              </p>
            </div>
            <button
              onClick={handleSkip}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex items-center space-x-2">
              {steps.map((_, index) => (
                <div
                  key={index}
                  className={`w-8 h-2 rounded-full ${
                    index <= onboardingStep ? 'bg-blue-600 dark:bg-blue-500' : 'bg-gray-200 dark:bg-[#2E2E2E]'
                  }`}
                />
              ))}
            </div>
            <p className="text-xs text-gray-500 dark:text-[#fafafacc] mt-2">
              Step {onboardingStep + 1} of {steps.length}
            </p>
          </div>

          {/* Content */}
          <div className="mb-6 transition-all duration-300 ease-out">
            {steps[onboardingStep].content}
          </div>

          {/* Actions */}
          <div className="flex justify-between">
            <button
              onClick={handleSkip}
              className="px-4 py-2 text-gray-600 dark:text-[#fafafacc] hover:text-gray-800 dark:hover:text-[#fafafa] transition-colors"
            >
              Skip for now
            </button>
            <button
              onClick={handleNext}
              disabled={saving}
              className="px-6 py-2 bg-[#171717] dark:bg-[#fafafa] text-white dark:text-[#171717] rounded-lg hover:bg-[#333333] dark:hover:bg-[#e5e5e5] disabled:opacity-50 transition-colors flex items-center space-x-2"
            >
              {saving ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <>
                  <span>{onboardingStep === steps.length - 1 ? 'Complete' : 'Next'}</span>
                  <ArrowRight className="w-4 h-4" />
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

import React, { useState, useEffect, useRef } from 'react';
import { usePreferences } from '../context/PreferencesContext';
import { Settings, Save, RotateCcw, Check } from 'lucide-react';

const PreferencesSettings = ({ embedded = false }) => {
  const { preferences, updatePreferences, resetToDefaults } = usePreferences();
  const [localPreferences, setLocalPreferences] = useState(null);
  const [coursesInput, setCoursesInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const coursesInputTouched = useRef(false);

  useEffect(() => {
    const defaultPrefs = {
      contentPreferences: {
        quizFormat: 'multiple-choice',
        quizQuestions: 10,
        summaryLength: 'medium',
        blogLength: 'medium',
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
    };

    const p = preferences || {};
    const merged = {
      ...defaultPrefs,
      ...p,
      contentPreferences: { ...defaultPrefs.contentPreferences, ...(p.contentPreferences || {}) },
      tonePreferences: { ...defaultPrefs.tonePreferences, ...(p.tonePreferences || {}) },
      learningBehavior: { ...defaultPrefs.learningBehavior, ...(p.learningBehavior || {}) },
      contentCustomization: { ...defaultPrefs.contentCustomization, ...(p.contentCustomization || {}) },
      studyProfile: { ...defaultPrefs.studyProfile, ...(p.studyProfile || {}) }
    };
    setLocalPreferences(merged);
    
    // Only update coursesInput if user hasn't touched it
    if (!coursesInputTouched.current) {
      setCoursesInput((merged.studyProfile.courses || []).join(', '));
    }
  }, [preferences]);

  const handleSave = async () => {
    try {
      setSaving(true);
      const payload = {
        ...localPreferences,
        studyProfile: {
          ...(localPreferences.studyProfile || {}),
          courses: coursesInput
            .split(',')
            .map(s => s.trim())
            .filter(Boolean)
        }
      };
      await updatePreferences(payload);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error('Failed to save preferences:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    try {
      await resetToDefaults();
      coursesInputTouched.current = false;
      setLocalPreferences(preferences);
      setCoursesInput((preferences?.studyProfile?.courses || []).join(', '));
    } catch (error) {
      console.error('Failed to reset preferences:', error);
    }
  };

  if (!localPreferences) return <div>Loading...</div>;

  const outerContent = (
    <>
        {!embedded && (
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">User Preferences</h1>
            <div className="flex gap-2">
              <button onClick={handleReset} className="px-3 py-1.5 bg-gray-100 dark:bg-[#fafafa1a] text-gray-700 dark:text-[#fafafacc] rounded-lg hover:bg-gray-200 dark:hover:bg-[#fafafa2a] transition-colors flex items-center gap-2">
                <RotateCcw className="w-4 h-4" />
                <span>Reset</span>
              </button>
              <button onClick={handleSave} disabled={saving} className="px-3 py-1.5 bg-[#171717] dark:bg-[#fafafa] text-white dark:text-[#171717] rounded-lg hover:bg-[#333333] dark:hover:bg-[#e5e5e5] disabled:opacity-50 transition-colors flex items-center gap-2">
                {saving ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div> : <Save className="w-4 h-4" />}
                <span>Save</span>
              </button>
            </div>
          </div>
        )}

        {/* Header for embedded mode */}
        {embedded && (
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">User Preferences</h3>
            <div className="flex gap-2">
              <button onClick={handleReset} className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-[#fafafa1a] text-gray-700 dark:text-[#fafafacc] rounded-lg hover:bg-gray-200 dark:hover:bg-[#fafafa2a] transition-colors flex items-center gap-2">
                <RotateCcw className="w-4 h-4" />
                <span>Reset</span>
              </button>
              <button onClick={handleSave} disabled={saving} className="px-3 py-1.5 text-sm bg-[#171717] dark:bg-[#fafafa] text-white dark:text-[#171717] rounded-lg hover:bg-[#333333] dark:hover:bg-[#e5e5e5] disabled:opacity-50 transition-colors flex items-center gap-2">
                {saving ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div> : <Save className="w-4 h-4" />}
                <span>Save</span>
              </button>
            </div>
          </div>
        )}

        {/* Content Preferences */}
        <div className="divide-y divide-gray-200 dark:divide-[#fafafa1a]">
          <div className="py-4 flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Quiz Format</label>
            </div>
            <select
              value={localPreferences.contentPreferences.quizFormat}
              onChange={(e) => setLocalPreferences({
                ...localPreferences,
                contentPreferences: {
                  ...localPreferences.contentPreferences,
                  quizFormat: e.target.value
                }
              })}
              className="w-56 p-2 border border-gray-300 dark:border-[#fafafa1a] rounded-lg bg-white dark:bg-[#171717] text-gray-900 dark:text-white"
            >
              <option value="multiple-choice">Multiple Choice</option>
              <option value="true-false">True/False</option>
            </select>
          </div>

          <div className="py-4 flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Quiz Questions</label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Number of questions to generate</p>
            </div>
            <input
              type="number"
              min="5"
              max="20"
              value={localPreferences.contentPreferences.quizQuestions}
              onChange={(e) => setLocalPreferences({
                ...localPreferences,
                contentPreferences: {
                  ...localPreferences.contentPreferences,
                  quizQuestions: parseInt(e.target.value) || 10
                }
              })}
              className="w-20 p-2 border border-gray-300 dark:border-[#fafafa1a] rounded-lg bg-white dark:bg-[#171717] text-gray-900 dark:text-white"
            />
          </div>

          <div className="py-4 flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Summary Length</label>
            </div>
            <select
              value={localPreferences.contentPreferences.summaryLength}
              onChange={(e) => setLocalPreferences({
                ...localPreferences,
                contentPreferences: {
                  ...localPreferences.contentPreferences,
                  summaryLength: e.target.value
                }
              })}
              className="w-56 p-2 border border-gray-300 dark:border-[#fafafa1a] rounded-lg bg-white dark:bg-[#171717] text-gray-900 dark:text-white"
            >
              <option value="brief">Brief (200-300 words)</option>
              <option value="medium">Medium (400-600 words)</option>
              <option value="detailed">Detailed (800-1200 words)</option>
            </select>
          </div>

          <div className="py-4 flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Blog Length</label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Controls blog post length</p>
            </div>
            <select
              value={localPreferences.contentPreferences.blogLength}
              onChange={(e) => setLocalPreferences({
                ...localPreferences,
                contentPreferences: {
                  ...localPreferences.contentPreferences,
                  blogLength: e.target.value
                }
              })}
              className="w-56 p-2 border border-gray-300 dark:border-[#fafafa1a] rounded-lg bg-white dark:bg-[#171717] text-gray-900 dark:text-white"
            >
              <option value="brief">Brief (800-1200 words)</option>
              <option value="medium">Medium (1500-2000 words)</option>
              <option value="detailed">Detailed (2500-3500 words)</option>
            </select>
          </div>

          <div className="py-4 flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Flashcard Style</label>
            </div>
            <select
              value={localPreferences.contentPreferences.flashcardStyle}
              onChange={(e) => setLocalPreferences({
                ...localPreferences,
                contentPreferences: {
                  ...localPreferences.contentPreferences,
                  flashcardStyle: e.target.value
                }
              })}
              className="w-56 p-2 border border-gray-300 dark:border-[#fafafa1a] rounded-lg bg-white dark:bg-[#171717] text-gray-900 dark:text-white"
            >
              <option value="simple">Simple (Short Q&A)</option>
              <option value="detailed">Detailed (With explanations)</option>
              <option value="visual">Visual (With emojis & metaphors)</option>
            </select>
          </div>

          <div className="py-4 flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Presentation Slides</label>
            </div>
            <input
              type="number"
              min="5"
              max="50"
              value={localPreferences.contentPreferences.presentationSlides}
              onChange={(e) => setLocalPreferences({
                ...localPreferences,
                contentPreferences: {
                  ...localPreferences.contentPreferences,
                  presentationSlides: parseInt(e.target.value)
                }
              })}
              className="w-28 p-2 border border-gray-300 dark:border-[#fafafa1a] rounded-lg bg-white dark:bg-[#171717] text-gray-900 dark:text-white"
            />
          </div>
        </div>

        {/* Tone Preferences */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-[#fafafa] mb-4">
            Tone & Style Preferences
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                className="w-full p-3 border border-gray-300 dark:border-[#fafafa1a] rounded-lg bg-white dark:bg-[#171717] text-gray-900 dark:text-[#fafafa] focus:ring-2 focus:ring-blue-500"
              >
                <option value="academic">Academic</option>
                <option value="casual">Casual</option>
                <option value="professional">Professional</option>
                <option value="friendly">Friendly</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-[#fafafacc] mb-2">
                Complexity Level
              </label>
              <select
                value={localPreferences.tonePreferences.complexityLevel}
                onChange={(e) => setLocalPreferences({
                  ...localPreferences,
                  tonePreferences: {
                    ...localPreferences.tonePreferences,
                    complexityLevel: e.target.value
                  }
                })}
                className="w-full p-3 border border-gray-300 dark:border-[#fafafa1a] rounded-lg bg-white dark:bg-[#171717] text-gray-900 dark:text-[#fafafa] focus:ring-2 focus:ring-blue-500"
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-[#fafafacc] mb-2">
                Language Style
              </label>
              <select
                value={localPreferences.tonePreferences.languageStyle}
                onChange={(e) => setLocalPreferences({
                  ...localPreferences,
                  tonePreferences: {
                    ...localPreferences.tonePreferences,
                    languageStyle: e.target.value
                  }
                })}
                className="w-full p-3 border border-gray-300 dark:border-[#fafafa1a] rounded-lg bg-white dark:bg-[#171717] text-gray-900 dark:text-[#fafafa] focus:ring-2 focus:ring-blue-500"
              >
                <option value="formal">Formal</option>
                <option value="informal">Informal</option>
                <option value="conversational">Conversational</option>
              </select>
            </div>
          </div>
        </div>

        {/* Study Profile */}
        <div className="mt-6 divide-y divide-gray-200 dark:divide-[#fafafa1a]">
          <div className="py-4 flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Purpose</label>
            </div>
            <select
              value={localPreferences.studyProfile?.purpose || ''}
              onChange={(e) => setLocalPreferences({
                ...localPreferences,
                studyProfile: {
                  ...(localPreferences.studyProfile || {}),
                  purpose: e.target.value
                }
              })}
              className="w-56 p-2 border border-gray-300 dark:border-[#fafafa1a] rounded-lg bg-white dark:bg-[#171717] text-gray-900 dark:text-white"
            >
              <option value="">Select</option>
              <option value="Study">Study</option>
              <option value="Research">Research</option>
              <option value="Teaching">Teaching</option>
              <option value="Revision">Revision</option>
            </select>
          </div>

          <div className="py-4 flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">School</label>
            </div>
            <input
              type="text"
              value={localPreferences.studyProfile?.school || ''}
              onChange={(e) => setLocalPreferences({
                ...localPreferences,
                studyProfile: {
                  ...(localPreferences.studyProfile || {}),
                  school: e.target.value
                }
              })}
              placeholder="COMSATS University Islamabad (CUI)"
              className="w-72 p-2 border border-gray-300 dark:border-[#fafafa1a] rounded-lg bg-white dark:bg-[#171717] text-gray-900 dark:text-white"
            />
          </div>

          <div className="py-4 flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Courses</label>
            </div>
            <input
              type="text"
              value={coursesInput}
              onChange={(e) => {
                coursesInputTouched.current = true;
                setCoursesInput(e.target.value);
              }}
              placeholder="Computer Science, Data Structures"
              className="w-96 p-2 border border-gray-300 dark:border-[#fafafa1a] rounded-lg bg-white dark:bg-[#171717] text-gray-900 dark:text-white"
            />
          </div>
        </div>

        {/* Content Customization */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-[#fafafa] mb-4">
            Content Customization
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-[#fafafa1a] rounded-lg">
              <div>
                <h3 className="font-medium text-gray-900 dark:text-[#fafafa]">Include Examples</h3>
                <p className="text-sm text-gray-500 dark:text-[#fafafacc]">Add practical examples to content</p>
              </div>
              <input
                type="checkbox"
                checked={localPreferences.contentCustomization.includeExamples}
                onChange={(e) => setLocalPreferences({
                  ...localPreferences,
                  contentCustomization: {
                    ...localPreferences.contentCustomization,
                    includeExamples: e.target.checked
                  }
                })}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-[#fafafa1a] rounded-lg">
              <div>
                <h3 className="font-medium text-gray-900 dark:text-[#fafafa]">Include Visuals</h3>
                <p className="text-sm text-gray-500 dark:text-[#fafafacc]">Add diagrams and visual aids</p>
              </div>
              <input
                type="checkbox"
                checked={localPreferences.contentCustomization.includeVisuals}
                onChange={(e) => setLocalPreferences({
                  ...localPreferences,
                  contentCustomization: {
                    ...localPreferences.contentCustomization,
                    includeVisuals: e.target.checked
                  }
                })}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-[#fafafa1a] rounded-lg">
              <div>
                <h3 className="font-medium text-gray-900 dark:text-[#fafafa]">Include References</h3>
                <p className="text-sm text-gray-500 dark:text-[#fafafacc]">Add source citations and references</p>
              </div>
              <input
                type="checkbox"
                checked={localPreferences.contentCustomization.includeReferences}
                onChange={(e) => setLocalPreferences({
                  ...localPreferences,
                  contentCustomization: {
                    ...localPreferences.contentCustomization,
                    includeReferences: e.target.checked
                  }
                })}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-[#fafafa1a] rounded-lg">
              <div>
                <h3 className="font-medium text-gray-900 dark:text-[#fafafa]">Personalized Examples</h3>
                <p className="text-sm text-gray-500 dark:text-[#fafafacc]">Use user's field/industry examples</p>
              </div>
              <input
                type="checkbox"
                checked={localPreferences.contentCustomization.personalizedExamples}
                onChange={(e) => setLocalPreferences({
                  ...localPreferences,
                  contentCustomization: {
                    ...localPreferences.contentCustomization,
                    personalizedExamples: e.target.checked
                  }
                })}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
    </>
  );

  return embedded ? (
    outerContent
  ) : (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white dark:bg-[#171717] rounded-2xl shadow-xl p-8">
        {outerContent}
      </div>
    </div>
  );
};

export default PreferencesSettings;

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './FirebaseAuthContext';
import axios from '../utils/axios';

const OnboardingContext = createContext();

export const useOnboarding = () => {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboarding must be used within OnboardingProvider');
  }
  return context;
};

export const OnboardingProvider = ({ children }) => {
  const { user } = useAuth();
  const [isOnboarding, setIsOnboarding] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('OnboardingContext useEffect triggered, user:', user?.uid);
    if (user) {
      // Add a small delay to ensure user is created in database
      setTimeout(() => {
        checkOnboardingStatus();
      }, 1000);
    } else {
      console.log('No user, setting loading to false');
      setLoading(false);
    }
  }, [user]);

  const checkOnboardingStatus = async (retryCount = 0) => {
    try {
      console.log('Checking onboarding status for user:', user?.uid, 'retry:', retryCount);
      const response = await axios.get('/api/users/onboarding-status');
      const { isCompleted, preferencesSet } = response.data;
      
      console.log('Onboarding status:', { isCompleted, preferencesSet });
      
      if (!isCompleted || !preferencesSet) {
        console.log('User needs onboarding, showing modal');
        setIsOnboarding(true);
        setOnboardingStep(preferencesSet ? 1 : 0);
      } else {
        console.log('User onboarding already completed');
      }
    } catch (error) {
      console.error('Failed to check onboarding status:', error);
      
      // Retry up to 3 times with increasing delay
      if (retryCount < 3) {
        console.log(`Retrying onboarding status check in ${(retryCount + 1) * 1000}ms...`);
        setTimeout(() => {
          checkOnboardingStatus(retryCount + 1);
        }, (retryCount + 1) * 1000);
        return;
      }
      
      console.error('Max retries reached, giving up on onboarding check');
    } finally {
      if (retryCount === 0) {
        setLoading(false);
      }
    }
  };

  const completeOnboarding = async () => {
    try {
      await axios.post('/api/users/complete-onboarding');
      setIsOnboarding(false);
      setOnboardingStep(0);
    } catch (error) {
      console.error('Failed to complete onboarding:', error);
    }
  };

  const skipOnboarding = async () => {
    try {
      await axios.post('/api/users/skip-onboarding');
      setIsOnboarding(false);
      setOnboardingStep(0);
    } catch (error) {
      console.error('Failed to skip onboarding:', error);
    }
  };

  return (
    <OnboardingContext.Provider value={{
      isOnboarding,
      onboardingStep,
      setOnboardingStep,
      completeOnboarding,
      skipOnboarding,
      loading
    }}>
      {children}
    </OnboardingContext.Provider>
  );
};

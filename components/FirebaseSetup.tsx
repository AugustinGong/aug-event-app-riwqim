
import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
} from 'react-native';
import { commonStyles, colors } from '../styles/commonStyles';
import Icon from './Icon';

const FirebaseSetup: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      title: 'Create Firebase Project',
      description: 'Go to Firebase Console and create a new project',
      action: () => Linking.openURL('https://console.firebase.google.com/'),
      actionText: 'Open Firebase Console',
    },
    {
      title: 'Enable Authentication',
      description: 'Enable Email/Password authentication in your Firebase project',
      details: [
        'Go to Authentication > Sign-in method',
        'Enable Email/Password provider',
        'Optionally enable Google and Apple sign-in',
      ],
    },
    {
      title: 'Create Firestore Database',
      description: 'Set up Firestore for storing event and user data',
      details: [
        'Go to Firestore Database',
        'Create database in production mode',
        'Choose a location close to your users',
      ],
    },
    {
      title: 'Enable Storage',
      description: 'Enable Firebase Storage for photo uploads',
      details: [
        'Go to Storage',
        'Get started with default rules',
        'Choose the same location as Firestore',
      ],
    },
    {
      title: 'Configure Your App',
      description: 'Add your Firebase configuration to the app',
      details: [
        'Go to Project Settings > General',
        'Add an app (iOS/Android/Web)',
        'Copy the configuration object',
        'Replace the config in config/firebase.ts',
      ],
    },
    {
      title: 'Set Security Rules',
      description: 'Configure Firestore and Storage security rules',
      details: [
        'Update Firestore rules to allow authenticated users',
        'Update Storage rules for photo uploads',
        'Test the rules in the Firebase console',
      ],
    },
  ];

  const renderStep = (step: typeof steps[0], index: number) => (
    <View
      key={index}
      style={[
        commonStyles.card,
        {
          marginBottom: 16,
          borderLeftWidth: 4,
          borderLeftColor: index <= currentStep ? colors.primary : colors.border,
          backgroundColor: index <= currentStep ? colors.primary + '10' : colors.surface,
        }
      ]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
        <View
          style={{
            width: 24,
            height: 24,
            borderRadius: 12,
            backgroundColor: index <= currentStep ? colors.primary : colors.border,
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 12,
          }}
        >
          <Text style={{ color: 'white', fontSize: 12, fontWeight: '600' }}>
            {index + 1}
          </Text>
        </View>
        
        <View style={{ flex: 1 }}>
          <Text style={[commonStyles.subtitle, { marginBottom: 4 }]}>
            {step.title}
          </Text>
          <Text style={[commonStyles.textSecondary, { marginBottom: 8 }]}>
            {step.description}
          </Text>
          
          {step.details && (
            <View style={{ marginBottom: 8 }}>
              {step.details.map((detail, detailIndex) => (
                <Text
                  key={detailIndex}
                  style={[commonStyles.textSecondary, { fontSize: 12, marginBottom: 2 }]}
                >
                  • {detail}
                </Text>
              ))}
            </View>
          )}
          
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {step.action && (
              <TouchableOpacity
                style={[
                  commonStyles.button,
                  {
                    backgroundColor: colors.primary,
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    marginRight: 8,
                  }
                ]}
                onPress={step.action}
              >
                <Text style={[commonStyles.buttonText, { fontSize: 12 }]}>
                  {step.actionText}
                </Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity
              style={[
                commonStyles.button,
                {
                  backgroundColor: 'transparent',
                  borderWidth: 1,
                  borderColor: colors.primary,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                }
              ]}
              onPress={() => {
                if (index < steps.length - 1) {
                  setCurrentStep(index + 1);
                } else {
                  Alert.alert(
                    'Setup Complete!',
                    'Your Firebase integration is ready. Make sure to update the configuration in config/firebase.ts with your actual Firebase project details.'
                  );
                }
              }}
            >
              <Text style={[commonStyles.buttonText, { color: colors.primary, fontSize: 12 }]}>
                {index < steps.length - 1 ? 'Next Step' : 'Complete'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );

  return (
    <ScrollView style={commonStyles.container}>
      <View style={{ padding: 16 }}>
        <View style={[commonStyles.card, { backgroundColor: colors.warning + '20', marginBottom: 16 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <Icon name="alert-triangle" size={20} color={colors.warning} />
            <Text style={[commonStyles.subtitle, { marginLeft: 8, color: colors.warning }]}>
              Firebase Setup Required
            </Text>
          </View>
          <Text style={commonStyles.text}>
            To use all features of this app, you need to set up Firebase for authentication, 
            database, and storage. Follow the steps below to get started.
          </Text>
        </View>

        <Text style={[commonStyles.title, { marginBottom: 16 }]}>
          Firebase Setup Guide
        </Text>

        {steps.map((step, index) => renderStep(step, index))}

        <View style={[commonStyles.card, { backgroundColor: colors.success + '20', marginTop: 16 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <Icon name="check-circle" size={20} color={colors.success} />
            <Text style={[commonStyles.subtitle, { marginLeft: 8, color: colors.success }]}>
              Need Help?
            </Text>
          </View>
          <Text style={commonStyles.text}>
            Check the Firebase documentation for detailed setup instructions, or contact 
            support if you encounter any issues during the setup process.
          </Text>
          <TouchableOpacity
            style={[
              commonStyles.button,
              { backgroundColor: colors.success, marginTop: 12 }
            ]}
            onPress={() => Linking.openURL('https://firebase.google.com/docs')}
          >
            <Text style={commonStyles.buttonText}>
              View Firebase Docs
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

export default FirebaseSetup;

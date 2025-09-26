
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

export default function SupabaseSetup() {
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  const steps = [
    {
      id: 1,
      title: 'Create Supabase Project',
      description: 'Go to supabase.com and create a new project',
      action: 'Open Supabase',
      url: 'https://supabase.com/dashboard',
    },
    {
      id: 2,
      title: 'Get Project URL & API Key',
      description: 'Copy your project URL and anon public key from Settings > API',
      action: 'View Guide',
      url: 'https://supabase.com/docs/guides/getting-started/quickstarts/reactjs#get-the-api-keys',
    },
    {
      id: 3,
      title: 'Set Environment Variables',
      description: 'Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to your .env file',
      action: 'Learn More',
      url: 'https://docs.expo.dev/guides/environment-variables/',
    },
    {
      id: 4,
      title: 'Run Database Schema',
      description: 'Execute the SQL schema in your Supabase SQL editor',
      action: 'View Schema',
      url: null,
    },
    {
      id: 5,
      title: 'Enable Authentication',
      description: 'Configure email authentication in Supabase Auth settings',
      action: 'Auth Guide',
      url: 'https://supabase.com/docs/guides/auth/auth-email',
    },
  ];

  const toggleStep = (stepId: number) => {
    setCompletedSteps(prev => 
      prev.includes(stepId) 
        ? prev.filter(id => id !== stepId)
        : [...prev, stepId]
    );
  };

  const openURL = async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Error', 'Cannot open this URL');
      }
    } catch (error) {
      console.log('Error opening URL:', error);
      Alert.alert('Error', 'Failed to open URL');
    }
  };

  const showSchema = () => {
    Alert.alert(
      'Database Schema',
      'The SQL schema file (supabase-schema.sql) contains all the necessary tables and policies. Copy its contents and run it in your Supabase SQL editor.',
      [
        { text: 'OK' },
        {
          text: 'Open SQL Editor',
          onPress: () => openURL('https://supabase.com/dashboard/project/_/sql'),
        },
      ]
    );
  };

  const renderStep = (step: typeof steps[0], index: number) => {
    const isCompleted = completedSteps.includes(step.id);
    
    return (
      <View
        key={step.id}
        style={{
          backgroundColor: colors.surface,
          borderRadius: 12,
          padding: 16,
          marginBottom: 12,
          borderWidth: 1,
          borderColor: isCompleted ? colors.success : colors.border,
          ...commonStyles.shadow,
        }}
      >
        <View style={{
          flexDirection: 'row',
          alignItems: 'flex-start',
          marginBottom: 12,
        }}>
          <TouchableOpacity
            onPress={() => toggleStep(step.id)}
            style={{
              width: 24,
              height: 24,
              borderRadius: 12,
              backgroundColor: isCompleted ? colors.success : colors.border,
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 12,
            }}
          >
            {isCompleted && (
              <Icon name="check" size={14} color={colors.background} />
            )}
          </TouchableOpacity>
          
          <View style={{ flex: 1 }}>
            <Text style={[
              commonStyles.subtitle,
              { color: isCompleted ? colors.success : colors.text }
            ]}>
              {index + 1}. {step.title}
            </Text>
            <Text style={[commonStyles.caption, { marginTop: 4 }]}>
              {step.description}
            </Text>
          </View>
        </View>
        
        <TouchableOpacity
          style={[
            commonStyles.button,
            {
              backgroundColor: colors.secondary,
              alignSelf: 'flex-start',
            }
          ]}
          onPress={() => {
            if (step.id === 4) {
              showSchema();
            } else if (step.url) {
              openURL(step.url);
            }
          }}
        >
          <Text style={[commonStyles.buttonText, { color: colors.text }]}>
            {step.action}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <ScrollView style={commonStyles.container}>
      <View style={{ padding: 20 }}>
        <View style={[commonStyles.centerContent, { marginBottom: 32 }]}>
          <Icon name="database" size={48} color={colors.primary} />
          <Text style={[commonStyles.title, { marginTop: 16, textAlign: 'center' }]}>
            Supabase Setup Required
          </Text>
          <Text style={[commonStyles.subtitle, { textAlign: 'center', marginTop: 8 }]}>
            Complete these steps to set up your backend
          </Text>
        </View>

        {steps.map((step, index) => renderStep(step, index))}

        <View style={{
          backgroundColor: colors.secondary,
          borderRadius: 12,
          padding: 16,
          marginTop: 20,
        }}>
          <Text style={[commonStyles.subtitle, { color: colors.primary }]}>
            Need Help?
          </Text>
          <Text style={[commonStyles.caption, { marginTop: 8 }]}>
            Check out the Supabase documentation or contact support if you need assistance setting up your project.
          </Text>
          
          <TouchableOpacity
            style={[commonStyles.button, { marginTop: 12, alignSelf: 'flex-start' }]}
            onPress={() => openURL('https://supabase.com/docs')}
          >
            <Text style={commonStyles.buttonText}>
              View Documentation
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

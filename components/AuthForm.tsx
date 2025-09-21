
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert } from 'react-native';
import { commonStyles, colors, buttonStyles } from '../styles/commonStyles';
import { useAuth } from '../hooks/useAuth';
import Icon from './Icon';

interface AuthFormProps {
  onSuccess: () => void;
}

export default function AuthForm({ onSuccess }: AuthFormProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { login, register } = useAuth();

  const handleSubmit = async () => {
    if (!email || !password || (!isLogin && !name)) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setIsLoading(true);
    
    try {
      let result;
      if (isLogin) {
        result = await login(email, password);
      } else {
        result = await register(email, password, name);
      }

      if (result.success) {
        onSuccess();
      } else {
        Alert.alert('Error', result.error || 'Authentication failed');
      }
    } catch (error) {
      console.log('Auth error:', error);
      Alert.alert('Error', 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={commonStyles.card}>
      <View style={{ alignItems: 'center', marginBottom: 24 }}>
        <Icon name="people-circle" size={64} color={colors.primary} />
        <Text style={commonStyles.title}>
          {isLogin ? 'Welcome Back' : 'Join AUG-Event'}
        </Text>
        <Text style={commonStyles.textSecondary}>
          {isLogin ? 'Sign in to your account' : 'Create your account'}
        </Text>
      </View>

      {!isLogin && (
        <TextInput
          style={commonStyles.input}
          placeholder="Full Name"
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
        />
      )}

      <TextInput
        style={commonStyles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <TextInput
        style={commonStyles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <TouchableOpacity
        style={[buttonStyles.primary, { marginBottom: 16 }]}
        onPress={handleSubmit}
        disabled={isLoading}
      >
        <Text style={{ color: 'white', fontSize: 16, fontWeight: '600' }}>
          {isLoading ? 'Loading...' : (isLogin ? 'Sign In' : 'Sign Up')}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => setIsLogin(!isLogin)}
        style={{ alignItems: 'center' }}
      >
        <Text style={[commonStyles.textSecondary, { textDecorationLine: 'underline' }]}>
          {isLogin ? 'Need an account? Sign up' : 'Already have an account? Sign in'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

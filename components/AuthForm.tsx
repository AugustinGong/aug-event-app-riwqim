
import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { commonStyles, colors, buttonStyles } from '../styles/commonStyles';
import Icon from './Icon';
import LanguageSelector from './LanguageSelector';
import i18n from '../config/i18n';
import { View, Text, TextInput, TouchableOpacity, Alert, Keyboard, TouchableWithoutFeedback } from 'react-native';

interface AuthFormProps {
  onSuccess: () => void;
}

export default function AuthForm({ onSuccess }: AuthFormProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();

  const handleSubmit = async () => {
    if (!email || !password) {
      Alert.alert(i18n.t('common.error'), 'Please fill in all fields');
      return;
    }

    if (!isLogin && password !== confirmPassword) {
      Alert.alert(i18n.t('common.error'), 'Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        const result = await login(email, password);
        if (result.error) {
          Alert.alert(i18n.t('common.error'), result.error.message || i18n.t('auth.invalidCredentials'));
        } else {
          onSuccess();
        }
      } else {
        const result = await register(email, password);
        if (result.error) {
          Alert.alert(i18n.t('common.error'), result.error.message || 'Registration failed');
        } else {
          Alert.alert(
            i18n.t('auth.emailVerification'),
            i18n.t('auth.emailVerificationMessage'),
            [{ text: i18n.t('common.close') }]
          );
        }
      }
    } catch (error: any) {
      console.log('Auth error:', error);
      Alert.alert(i18n.t('common.error'), error.message || i18n.t('errors.unknownError'));
    } finally {
      setLoading(false);
    }
  };

  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };

  return (
    <TouchableWithoutFeedback onPress={dismissKeyboard}>
      <View style={[commonStyles.container, { justifyContent: 'center' }]}>
        <View style={[commonStyles.card, { marginHorizontal: 20 }]}>
          <View style={{ alignItems: 'center', marginBottom: 30 }}>
            <Text style={[commonStyles.title, { color: colors.primary, fontSize: 32 }]}>
              AUG-Event
            </Text>
            <Text style={[commonStyles.subtitle, { marginTop: 8 }]}>
              {isLogin ? i18n.t('auth.login') : i18n.t('auth.register')}
            </Text>
          </View>

          <View style={{ marginBottom: 20 }}>
            <Text style={[commonStyles.label, { marginBottom: 8 }]}>
              {i18n.t('auth.email')}
            </Text>
            <TextInput
              style={commonStyles.input}
              value={email}
              onChangeText={setEmail}
              placeholder={i18n.t('auth.email')}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
          </View>

          <View style={{ marginBottom: 20 }}>
            <Text style={[commonStyles.label, { marginBottom: 8 }]}>
              {i18n.t('auth.password')}
            </Text>
            <TextInput
              style={commonStyles.input}
              value={password}
              onChangeText={setPassword}
              placeholder={i18n.t('auth.password')}
              secureTextEntry
              autoComplete="password"
            />
          </View>

          {!isLogin && (
            <View style={{ marginBottom: 20 }}>
              <Text style={[commonStyles.label, { marginBottom: 8 }]}>
                {i18n.t('auth.confirmPassword')}
              </Text>
              <TextInput
                style={commonStyles.input}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder={i18n.t('auth.confirmPassword')}
                secureTextEntry
                autoComplete="password"
              />
            </View>
          )}

          <TouchableOpacity
            style={[buttonStyles.primary, { marginBottom: 20 }]}
            onPress={handleSubmit}
            disabled={loading}
          >
            <Text style={{ color: 'white', fontSize: 16, fontWeight: '600' }}>
              {loading ? i18n.t('common.loading') : (isLogin ? i18n.t('auth.signIn') : i18n.t('auth.signUp'))}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{ alignItems: 'center', marginBottom: 20 }}
            onPress={() => setIsLogin(!isLogin)}
          >
            <Text style={[commonStyles.textSecondary, { textAlign: 'center' }]}>
              {isLogin ? i18n.t('auth.dontHaveAccount') : i18n.t('auth.alreadyHaveAccount')}
            </Text>
            <Text style={[commonStyles.text, { color: colors.primary, marginTop: 4 }]}>
              {isLogin ? i18n.t('auth.signUp') : i18n.t('auth.signIn')}
            </Text>
          </TouchableOpacity>

          <View style={{ marginTop: 20 }}>
            <LanguageSelector />
          </View>
        </View>
      </View>
    </TouchableWithoutFeedback>
  );
}

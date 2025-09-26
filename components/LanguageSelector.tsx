
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { commonStyles, colors, buttonStyles } from '../styles/commonStyles';
import Icon from './Icon';
import SimpleBottomSheet from './BottomSheet';
import i18n, { changeLanguage, getAvailableLanguages, getCurrentLanguage } from '../config/i18n';

interface LanguageSelectorProps {
  onLanguageChange?: () => void;
}

export default function LanguageSelector({ onLanguageChange }: LanguageSelectorProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState(getCurrentLanguage());
  const availableLanguages = getAvailableLanguages();

  const handleLanguageSelect = async (languageCode: string) => {
    try {
      await changeLanguage(languageCode);
      setCurrentLanguage(languageCode);
      setIsVisible(false);
      
      Alert.alert(
        i18n.t('settings.languageChanged'),
        '',
        [{ text: i18n.t('common.close') }]
      );
      
      if (onLanguageChange) {
        onLanguageChange();
      }
    } catch (error) {
      console.log('Error changing language:', error);
      Alert.alert(
        i18n.t('common.error'),
        i18n.t('errors.unknownError'),
        [{ text: i18n.t('common.close') }]
      );
    }
  };

  const getCurrentLanguageName = () => {
    const current = availableLanguages.find(lang => lang.code === currentLanguage);
    return current ? current.nativeName : 'English';
  };

  return (
    <>
      <TouchableOpacity
        style={[
          buttonStyles.secondary, 
          { 
            flexDirection: 'row', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            paddingVertical: 12,
            paddingHorizontal: 16
          }
        ]}
        onPress={() => setIsVisible(true)}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Icon name="language" size={18} color={colors.primary} />
          <Text style={[commonStyles.text, { marginLeft: 10, fontSize: 14 }]}>
            {i18n.t('settings.language')}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={[commonStyles.textSecondary, { marginRight: 6, fontSize: 14 }]}>
            {getCurrentLanguageName()}
          </Text>
          <Icon name="chevron-right" size={14} color={colors.textSecondary} />
        </View>
      </TouchableOpacity>

      <SimpleBottomSheet
        isVisible={isVisible}
        onClose={() => setIsVisible(false)}
      >
        <View style={{ padding: 20 }}>
          <Text style={[commonStyles.title, { marginBottom: 20, textAlign: 'center' }]}>
            {i18n.t('settings.selectLanguage')}
          </Text>
          
          {availableLanguages.map((language) => (
            <TouchableOpacity
              key={language.code}
              style={[
                buttonStyles.secondary,
                {
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 12,
                  backgroundColor: currentLanguage === language.code ? colors.primaryLight : colors.cardBackground,
                }
              ]}
              onPress={() => handleLanguageSelect(language.code)}
            >
              <Text style={[
                commonStyles.text,
                { color: currentLanguage === language.code ? colors.primary : colors.text }
              ]}>
                {language.nativeName}
              </Text>
              {currentLanguage === language.code && (
                <Icon name="check" size={20} color={colors.primary} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </SimpleBottomSheet>
    </>
  );
}

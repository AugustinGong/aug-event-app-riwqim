
import { useRouter } from 'expo-router';
import { useEvents } from '../hooks/useEvents';
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, KeyboardAvoidingView, Platform, Keyboard, TouchableWithoutFeedback } from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { MenuCourse } from '../types';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from '../components/Icon';
import { commonStyles, colors, buttonStyles } from '../styles/commonStyles';
import DateTimePicker from '@react-native-community/datetimepicker';
import i18n from '../config/i18n';

export default function CreateEventScreen() {
  const { user } = useAuth();
  const { createEvent } = useEvents();
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [date, setDate] = useState(new Date());
  const [location, setLocation] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [courses, setCourses] = useState<MenuCourse[]>([]);
  const [loading, setLoading] = useState(false);

  const courseTypes = [
    { type: 'appetizer' as const, name: i18n.t('createEvent.appetizer'), icon: 'utensils' },
    { type: 'first' as const, name: i18n.t('createEvent.firstCourse'), icon: 'bowl' },
    { type: 'main' as const, name: i18n.t('createEvent.mainCourse'), icon: 'drumstick-bite' },
    { type: 'dessert' as const, name: i18n.t('createEvent.dessert'), icon: 'ice-cream' },
    { type: 'cake' as const, name: i18n.t('createEvent.cake'), icon: 'birthday-cake' },
  ];

  const addCourse = (type: typeof courseTypes[number]['type']) => {
    const courseType = courseTypes.find(ct => ct.type === type);
    if (!courseType) return;

    const newCourse: MenuCourse = {
      id: Date.now().toString(),
      type,
      name: courseType.name,
      description: '',
      served: false,
    };
    setCourses([...courses, newCourse]);
  };

  const removeCourse = (index: number) => {
    setCourses(courses.filter((_, i) => i !== index));
  };

  const updateCourse = (index: number, field: 'name' | 'description', value: string) => {
    const updatedCourses = [...courses];
    updatedCourses[index] = { ...updatedCourses[index], [field]: value };
    setCourses(updatedCourses);
  };

  const handleCreateEvent = async () => {
    if (!title.trim() || !location.trim()) {
      Alert.alert(i18n.t('common.error'), i18n.t('createEvent.fillAllFields'));
      return;
    }

    if (!user) {
      Alert.alert(i18n.t('common.error'), 'User not authenticated');
      return;
    }

    setLoading(true);
    try {
      await createEvent({
        title: title.trim(),
        date,
        location: location.trim(),
        menu: courses,
        organizerId: user.id,
      });

      Alert.alert(
        i18n.t('common.success'),
        i18n.t('createEvent.eventCreatedSuccess'),
        [{ text: i18n.t('common.close'), onPress: () => router.back() }]
      );
    } catch (error: any) {
      console.log('Error creating event:', error);
      Alert.alert(i18n.t('common.error'), error.message || i18n.t('errors.unknownError'));
    } finally {
      setLoading(false);
    }
  };

  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };

  return (
    <SafeAreaView style={[commonStyles.container, { backgroundColor: colors.background }]}>
      <View style={commonStyles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Icon name="arrow-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[commonStyles.subtitle, { margin: 0 }]}>
          {i18n.t('createEvent.title')}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableWithoutFeedback onPress={dismissKeyboard}>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
            keyboardShouldPersistTaps="handled"
          >
            <View style={[commonStyles.card, { marginBottom: 20 }]}>
              <Text style={[commonStyles.label, { marginBottom: 8 }]}>
                {i18n.t('createEvent.eventTitle')}
              </Text>
              <TextInput
                style={commonStyles.input}
                value={title}
                onChangeText={setTitle}
                placeholder={i18n.t('createEvent.eventTitlePlaceholder')}
              />
            </View>

            <View style={[commonStyles.card, { marginBottom: 20 }]}>
              <Text style={[commonStyles.label, { marginBottom: 8 }]}>
                {i18n.t('createEvent.eventDate')}
              </Text>
              <TouchableOpacity
                style={[commonStyles.input, { justifyContent: 'center' }]}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={commonStyles.text}>
                  {date.toLocaleDateString()} {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={date}
                  mode="datetime"
                  display="default"
                  onChange={(event, selectedDate) => {
                    setShowDatePicker(false);
                    if (selectedDate) {
                      setDate(selectedDate);
                    }
                  }}
                />
              )}
            </View>

            <View style={[commonStyles.card, { marginBottom: 20 }]}>
              <Text style={[commonStyles.label, { marginBottom: 8 }]}>
                {i18n.t('createEvent.eventLocation')}
              </Text>
              <TextInput
                style={commonStyles.input}
                value={location}
                onChangeText={setLocation}
                placeholder={i18n.t('createEvent.eventLocationPlaceholder')}
              />
            </View>

            <View style={[commonStyles.card, { marginBottom: 20 }]}>
              <Text style={[commonStyles.sectionTitle, { marginBottom: 15 }]}>
                {i18n.t('createEvent.menu')}
              </Text>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
                {courseTypes.map((courseType) => (
                  <TouchableOpacity
                    key={courseType.type}
                    style={[buttonStyles.secondary, { marginRight: 10, minWidth: 120 }]}
                    onPress={() => addCourse(courseType.type)}
                  >
                    <Icon name={courseType.icon} size={16} color={colors.primary} />
                    <Text style={{ color: colors.primary, fontSize: 14, fontWeight: '600', marginLeft: 6 }}>
                      {courseType.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {courses.map((course, index) => (
                <View key={course.id} style={[commonStyles.card, { marginBottom: 15, backgroundColor: colors.primaryLight }]}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <Text style={[commonStyles.subtitle, { color: colors.primary }]}>
                      {courseTypes.find(ct => ct.type === course.type)?.name}
                    </Text>
                    <TouchableOpacity onPress={() => removeCourse(index)}>
                      <Icon name="trash-2" size={20} color={colors.error} />
                    </TouchableOpacity>
                  </View>

                  <TextInput
                    style={[commonStyles.input, { marginBottom: 10 }]}
                    value={course.name}
                    onChangeText={(text) => updateCourse(index, 'name', text)}
                    placeholder={i18n.t('createEvent.courseNamePlaceholder')}
                  />

                  <TextInput
                    style={[commonStyles.input, { minHeight: 80 }]}
                    value={course.description}
                    onChangeText={(text) => updateCourse(index, 'description', text)}
                    placeholder={i18n.t('createEvent.courseDescriptionPlaceholder')}
                    multiline
                    textAlignVertical="top"
                  />
                </View>
              ))}
            </View>

            <TouchableOpacity
              style={[buttonStyles.primary, { marginTop: 20 }]}
              onPress={handleCreateEvent}
              disabled={loading}
            >
              <Text style={{ color: 'white', fontSize: 16, fontWeight: '600' }}>
                {loading ? i18n.t('common.loading') : i18n.t('createEvent.createEventButton')}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}


import { useRouter } from 'expo-router';
import { useEvents } from '../hooks/useEvents';
import i18n from '../config/i18n';
import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, KeyboardAvoidingView, Platform, Keyboard, TouchableWithoutFeedback } from 'react-native';
import { MenuCourse } from '../types';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from '../components/Icon';
import { commonStyles, colors, buttonStyles } from '../styles/commonStyles';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Redirect } from 'expo-router';

export default function CreateEventScreen() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();
  const { createEvent } = useEvents();
  
  // Initialize all state hooks at the top level
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [courses, setCourses] = useState<MenuCourse[]>([]);
  const [loading, setLoading] = useState(false);

  // Redirect to login if not authenticated
  if (!isLoading && !isAuthenticated) {
    console.log('User not authenticated, redirecting to login');
    return <Redirect href="/" />;
  }

  // Show loading if still checking authentication
  if (isLoading) {
    return (
      <SafeAreaView style={[commonStyles.container, commonStyles.centerContent]}>
        <Text style={[commonStyles.subtitle]}>
          {i18n.t('common.loading')}
        </Text>
      </SafeAreaView>
    );
  }

  const courseTypes = [
    { type: 'appetizer' as const, name: i18n.t('event.courses.appetizer'), icon: 'utensils' },
    { type: 'first' as const, name: i18n.t('event.courses.first'), icon: 'bowl' },
    { type: 'main' as const, name: i18n.t('event.courses.main'), icon: 'drumstick-bite' },
    { type: 'dessert' as const, name: i18n.t('event.courses.dessert'), icon: 'ice-cream' },
    { type: 'cake' as const, name: i18n.t('event.courses.cake'), icon: 'birthday-cake' },
  ];

  const addCourse = (type: typeof courseTypes[number]['type']) => {
    const newCourse: MenuCourse = {
      id: Date.now().toString(),
      type,
      name: '',
      description: '',
      isServed: false,
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
    console.log('Starting event creation...');
    console.log('Current user:', user?.id, user?.email);
    console.log('Is authenticated:', isAuthenticated);

    if (!title.trim()) {
      Alert.alert(i18n.t('common.error'), 'Please enter an event title');
      return;
    }

    if (!location.trim()) {
      Alert.alert(i18n.t('common.error'), 'Please enter a location');
      return;
    }

    if (courses.length === 0) {
      Alert.alert(i18n.t('common.error'), 'Please add at least one course');
      return;
    }

    // Validate courses have names
    const invalidCourses = courses.filter(course => !course.name.trim());
    if (invalidCourses.length > 0) {
      Alert.alert(i18n.t('common.error'), 'Please fill in all course names');
      return;
    }

    setLoading(true);
    try {
      console.log('Calling createEvent with data:', {
        title: title.trim(),
        description: description.trim(),
        location: location.trim(),
        date,
        menuCount: courses.length,
      });

      const result = await createEvent({
        title: title.trim(),
        description: description.trim(),
        location: location.trim(),
        date,
        menu: courses,
      });

      console.log('Create event result:', result);

      if (result.success && result.event) {
        Alert.alert(
          i18n.t('common.success'),
          'Event created successfully!',
          [
            {
              text: i18n.t('common.ok'),
              onPress: () => router.push(`/event/${result.event!.id}`),
            },
          ]
        );
      } else {
        console.log('Event creation failed:', result.error);
        Alert.alert(i18n.t('common.error'), result.error || 'Failed to create event');
      }
    } catch (error: any) {
      console.log('Create event error:', error);
      Alert.alert(i18n.t('common.error'), error.message || 'Failed to create event');
    } finally {
      setLoading(false);
    }
  };

  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };

  return (
    <SafeAreaView style={[commonStyles.container, { backgroundColor: colors.background }]}>
      <TouchableWithoutFeedback onPress={dismissKeyboard}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <View style={[commonStyles.header, { paddingHorizontal: 20 }]}>
            <TouchableOpacity onPress={() => router.back()}>
              <Icon name="arrow-left" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[commonStyles.title, { color: colors.primary }]}>
              {i18n.t('createEvent.title')}
            </Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
            keyboardShouldPersistTaps="handled"
          >
            {/* Debug info */}
            <View style={[commonStyles.card, { marginBottom: 20, backgroundColor: colors.cardBackground }]}>
              <Text style={[commonStyles.textSecondary, { fontSize: 12 }]}>
                Debug: User ID: {user?.id || 'Not found'}
              </Text>
              <Text style={[commonStyles.textSecondary, { fontSize: 12 }]}>
                Email: {user?.email || 'Not found'}
              </Text>
              <Text style={[commonStyles.textSecondary, { fontSize: 12 }]}>
                Authenticated: {isAuthenticated ? 'Yes' : 'No'}
              </Text>
            </View>
            <View style={[commonStyles.card, { marginBottom: 20 }]}>
              <Text style={[commonStyles.sectionTitle, { marginBottom: 20 }]}>
                {i18n.t('createEvent.eventDetails')}
              </Text>

              <View style={{ marginBottom: 20 }}>
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

              <View style={{ marginBottom: 20 }}>
                <Text style={[commonStyles.label, { marginBottom: 8 }]}>
                  {i18n.t('createEvent.description')}
                </Text>
                <TextInput
                  style={[commonStyles.input, { height: 80, textAlignVertical: 'top' }]}
                  value={description}
                  onChangeText={setDescription}
                  placeholder={i18n.t('createEvent.descriptionPlaceholder')}
                  multiline
                />
              </View>

              <View style={{ marginBottom: 20 }}>
                <Text style={[commonStyles.label, { marginBottom: 8 }]}>
                  {i18n.t('createEvent.location')}
                </Text>
                <TextInput
                  style={commonStyles.input}
                  value={location}
                  onChangeText={setLocation}
                  placeholder={i18n.t('createEvent.locationPlaceholder')}
                />
              </View>

              <View style={{ marginBottom: 20 }}>
                <Text style={[commonStyles.label, { marginBottom: 8 }]}>
                  {i18n.t('createEvent.dateTime')}
                </Text>
                <TouchableOpacity
                  style={[commonStyles.input, { justifyContent: 'center' }]}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Text style={{ color: colors.text }}>
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
            </View>

            <View style={[commonStyles.card, { marginBottom: 20 }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <Text style={commonStyles.sectionTitle}>
                  {i18n.t('createEvent.menu')}
                </Text>
              </View>

              <Text style={[commonStyles.textSecondary, { marginBottom: 20 }]}>
                {i18n.t('createEvent.addCourses')}
              </Text>

              <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 20 }}>
                {courseTypes.map((courseType) => (
                  <TouchableOpacity
                    key={courseType.type}
                    style={[
                      buttonStyles.secondary,
                      { 
                        marginRight: 10, 
                        marginBottom: 10, 
                        paddingHorizontal: 16, 
                        paddingVertical: 8,
                        flexDirection: 'row',
                        alignItems: 'center',
                      }
                    ]}
                    onPress={() => addCourse(courseType.type)}
                  >
                    <Icon name={courseType.icon} size={16} color={colors.primary} />
                    <Text style={{ color: colors.primary, marginLeft: 8, fontSize: 14 }}>
                      {courseType.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {courses.map((course, index) => (
                <View key={course.id} style={{ marginBottom: 20, padding: 16, backgroundColor: colors.cardBackground, borderRadius: 12 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <Text style={[commonStyles.subtitle, { color: colors.primary }]}>
                      {courseTypes.find(ct => ct.type === course.type)?.name}
                    </Text>
                    <TouchableOpacity onPress={() => removeCourse(index)}>
                      <Icon name="trash-2" size={20} color={colors.error} />
                    </TouchableOpacity>
                  </View>

                  <View style={{ marginBottom: 12 }}>
                    <Text style={[commonStyles.label, { marginBottom: 8 }]}>
                      {i18n.t('createEvent.courseName')}
                    </Text>
                    <TextInput
                      style={commonStyles.input}
                      value={course.name}
                      onChangeText={(value) => updateCourse(index, 'name', value)}
                      placeholder={i18n.t('createEvent.courseNamePlaceholder')}
                    />
                  </View>

                  <View>
                    <Text style={[commonStyles.label, { marginBottom: 8 }]}>
                      {i18n.t('createEvent.courseDescription')}
                    </Text>
                    <TextInput
                      style={[commonStyles.input, { height: 60, textAlignVertical: 'top' }]}
                      value={course.description}
                      onChangeText={(value) => updateCourse(index, 'description', value)}
                      placeholder={i18n.t('createEvent.courseDescriptionPlaceholder')}
                      multiline
                    />
                  </View>
                </View>
              ))}
            </View>

            <TouchableOpacity
              style={[buttonStyles.primary, { marginBottom: 20 }]}
              onPress={handleCreateEvent}
              disabled={loading}
            >
              <Text style={{ color: 'white', fontSize: 16, fontWeight: '600' }}>
                {loading ? i18n.t('common.loading') : i18n.t('createEvent.createEvent')}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
}

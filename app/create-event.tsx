
import DateTimePicker from '@react-native-community/datetimepicker';
import { useEvents } from '../hooks/useEvents';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, KeyboardAvoidingView, Platform, Keyboard, TouchableWithoutFeedback } from 'react-native';
import LanguageSelector from '../components/LanguageSelector';
import LocationPicker from '../components/LocationPicker';
import { useRouter } from 'expo-router';
import { commonStyles, colors, buttonStyles } from '../styles/commonStyles';
import i18n, { addLanguageChangeListener } from '../config/i18n';
import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState, useEffect } from 'react';
import { MenuCourse, EventType, EventTypeOption, LocationData } from '../types';
import Icon from '../components/Icon';
import { Redirect } from 'expo-router';
import { useAuth } from '../hooks/useAuth';

export default function CreateEventScreen() {
  const router = useRouter();
  const { createEvent } = useEvents();
  const { user, isAuthenticated, isLoading } = useAuth();
  const [forceUpdate, setForceUpdate] = useState(0);

  // Add language change listener for automatic UI updates
  useEffect(() => {
    const removeListener = addLanguageChangeListener(() => {
      console.log('Language changed in CreateEventScreen, forcing re-render');
      setForceUpdate(prev => prev + 1);
    });

    return removeListener;
  }, []);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [locationData, setLocationData] = useState<LocationData | null>(null);
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [eventType, setEventType] = useState<EventType>('celebration');
  const [menu, setMenu] = useState<MenuCourse[]>([]);
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

  const eventTypeOptions: EventTypeOption[] = [
    { type: 'wedding', icon: 'heart', color: '#FF69B4' },
    { type: 'birthday', icon: 'gift', color: '#FFD700' },
    { type: 'celebration', icon: 'star', color: '#8B5CF6' },
    { type: 'anniversary', icon: 'calendar', color: '#FF6B6B' },
    { type: 'graduation', icon: 'award', color: '#4ECDC4' },
    { type: 'corporate', icon: 'briefcase', color: '#45B7D1' },
    { type: 'party', icon: 'music', color: '#96CEB4' },
    { type: 'other', icon: 'more-horizontal', color: '#95A5A6' },
  ];

  const courseTypes = [
    { type: 'appetizer' as const, icon: 'coffee', label: i18n.t('event.courses.appetizer') },
    { type: 'first' as const, icon: 'bowl', label: i18n.t('event.courses.first') },
    { type: 'main' as const, icon: 'utensils', label: i18n.t('event.courses.main') },
    { type: 'dessert' as const, icon: 'ice-cream', label: i18n.t('event.courses.dessert') },
    { type: 'cake' as const, icon: 'cake', label: i18n.t('event.courses.cake') },
  ];

  const addCourse = (type: typeof courseTypes[number]['type']) => {
    const newCourse: MenuCourse = {
      id: Date.now().toString(),
      name: '',
      type,
      description: '',
      isServed: false,
    };
    setMenu([...menu, newCourse]);
  };

  const removeCourse = (index: number) => {
    const newMenu = menu.filter((_, i) => i !== index);
    setMenu(newMenu);
  };

  const updateCourse = (index: number, field: 'name' | 'description', value: string) => {
    const newMenu = [...menu];
    newMenu[index] = { ...newMenu[index], [field]: value };
    setMenu(newMenu);
  };

  const handleLocationSelect = (location: LocationData) => {
    console.log('Location selected:', location);
    setLocationData(location);
  };

  const handleCreateEvent = async () => {
    if (!title.trim()) {
      Alert.alert(i18n.t('common.error'), 'Please enter an event title');
      return;
    }

    if (!locationData || !locationData.address.trim()) {
      Alert.alert(i18n.t('common.error'), 'Please select a location for the event');
      return;
    }

    // Validate menu courses
    const validMenu = menu.filter(course => course.name.trim() !== '');
    if (menu.length > 0 && validMenu.length === 0) {
      Alert.alert(i18n.t('common.error'), 'Please complete the menu courses or remove them');
      return;
    }

    setLoading(true);
    try {
      const result = await createEvent({
        title: title.trim(),
        description: description.trim(),
        date,
        location: locationData.address.trim(),
        locationAddress: locationData.address.trim(),
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        eventType,
        menu: validMenu,
      });

      if (result.success) {
        Alert.alert(
          i18n.t('common.success'),
          i18n.t('createEvent.eventCreated'),
          [
            {
              text: i18n.t('common.ok'),
              onPress: () => router.replace('/home'),
            },
          ]
        );
      } else {
        Alert.alert(i18n.t('common.error'), result.error || 'Failed to create event');
      }
    } catch (error: any) {
      console.log('Error creating event:', error);
      Alert.alert(i18n.t('common.error'), error.message || 'Failed to create event');
    } finally {
      setLoading(false);
    }
  };

  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };

  return (
    <TouchableWithoutFeedback onPress={dismissKeyboard}>
      <SafeAreaView style={[commonStyles.container, { backgroundColor: colors.background }]}>
        <KeyboardAvoidingView 
          style={{ flex: 1 }} 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {/* Header */}
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
            contentContainerStyle={{ paddingBottom: 100 }}
            keyboardShouldPersistTaps="handled"
          >
            <View style={{ padding: 20 }}>
              {/* Event Details Section */}
              <Text style={[commonStyles.sectionTitle, { marginBottom: 20 }]}>
                {i18n.t('createEvent.eventDetails')}
              </Text>

              {/* Event Title */}
              <View style={{ marginBottom: 20 }}>
                <Text style={[commonStyles.label, { marginBottom: 8 }]}>
                  {i18n.t('createEvent.eventTitle')}
                </Text>
                <TextInput
                  style={commonStyles.input}
                  placeholder={i18n.t('createEvent.eventTitlePlaceholder')}
                  placeholderTextColor={colors.textSecondary}
                  value={title}
                  onChangeText={setTitle}
                  maxLength={100}
                />
              </View>

              {/* Description */}
              <View style={{ marginBottom: 20 }}>
                <Text style={[commonStyles.label, { marginBottom: 8 }]}>
                  {i18n.t('createEvent.description')}
                </Text>
                <TextInput
                  style={[commonStyles.input, { height: 80, textAlignVertical: 'top' }]}
                  placeholder={i18n.t('createEvent.descriptionPlaceholder')}
                  placeholderTextColor={colors.textSecondary}
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  maxLength={500}
                />
              </View>

              {/* Event Type */}
              <View style={{ marginBottom: 20 }}>
                <Text style={[commonStyles.label, { marginBottom: 12 }]}>
                  {i18n.t('createEvent.eventType')}
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                  {eventTypeOptions.map((option) => (
                    <TouchableOpacity
                      key={option.type}
                      style={[
                        {
                          flexDirection: 'row',
                          alignItems: 'center',
                          paddingHorizontal: 16,
                          paddingVertical: 12,
                          borderRadius: 12,
                          borderWidth: 2,
                          minWidth: '45%',
                        },
                        eventType === option.type
                          ? { 
                              backgroundColor: option.color + '20', 
                              borderColor: option.color 
                            }
                          : { 
                              backgroundColor: colors.cardBackground, 
                              borderColor: colors.border 
                            }
                      ]}
                      onPress={() => setEventType(option.type)}
                    >
                      <Icon 
                        name={option.icon} 
                        size={18} 
                        color={eventType === option.type ? option.color : colors.textSecondary} 
                      />
                      <Text style={[
                        commonStyles.text,
                        { 
                          marginLeft: 8, 
                          fontSize: 14,
                          color: eventType === option.type ? option.color : colors.text 
                        }
                      ]}>
                        {i18n.t(`eventTypes.${option.type}`)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Location with Map Integration */}
              <View style={{ marginBottom: 20 }}>
                <Text style={[commonStyles.label, { marginBottom: 8 }]}>
                  {i18n.t('createEvent.location')}
                </Text>
                <LocationPicker
                  onLocationSelect={handleLocationSelect}
                  placeholder={i18n.t('createEvent.locationPlaceholder')}
                />
                {locationData && locationData.latitude && locationData.longitude && (
                  <View style={[commonStyles.card, { marginTop: 10, backgroundColor: colors.success + '20' }]}>
                    <Text style={[commonStyles.textSecondary, { fontSize: 12 }]}>
                      ✓ Location coordinates saved: {locationData.latitude.toFixed(6)}, {locationData.longitude.toFixed(6)}
                    </Text>
                  </View>
                )}
              </View>

              {/* Date & Time */}
              <View style={{ marginBottom: 30 }}>
                <Text style={[commonStyles.label, { marginBottom: 8 }]}>
                  {i18n.t('createEvent.dateTime')}
                </Text>
                <TouchableOpacity
                  style={[commonStyles.input, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Text style={{ color: colors.text }}>
                    {date.toLocaleDateString()} at {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                  <Icon name="calendar" size={20} color={colors.textSecondary} />
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
                    minimumDate={new Date()}
                  />
                )}
              </View>

              {/* Menu Section */}
              <Text style={[commonStyles.sectionTitle, { marginBottom: 10 }]}>
                {i18n.t('createEvent.menu')}
              </Text>
              <Text style={[commonStyles.textSecondary, { marginBottom: 20, fontSize: 14 }]}>
                {i18n.t('createEvent.addCourses')}
              </Text>

              {/* Course Type Buttons */}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 }}>
                {courseTypes.map((courseType) => (
                  <TouchableOpacity
                    key={courseType.type}
                    style={[buttonStyles.secondary, { flexDirection: 'row', alignItems: 'center' }]}
                    onPress={() => addCourse(courseType.type)}
                  >
                    <Icon name={courseType.icon} size={16} color={colors.primary} />
                    <Text style={{ color: colors.primary, marginLeft: 6, fontSize: 12 }}>
                      {courseType.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Menu Courses */}
              {menu.map((course, index) => (
                <View key={course.id} style={[commonStyles.card, { marginBottom: 15 }]}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
                    <Text style={[commonStyles.subtitle, { color: colors.primary, textTransform: 'capitalize' }]}>
                      {i18n.t(`event.courses.${course.type}`)}
                    </Text>
                    <TouchableOpacity
                      onPress={() => removeCourse(index)}
                      style={{ padding: 4 }}
                    >
                      <Icon name="x" size={20} color={colors.error} />
                    </TouchableOpacity>
                  </View>

                  <View style={{ marginBottom: 15 }}>
                    <Text style={[commonStyles.label, { marginBottom: 8 }]}>
                      {i18n.t('createEvent.courseName')}
                    </Text>
                    <TextInput
                      style={commonStyles.input}
                      placeholder={i18n.t('createEvent.courseNamePlaceholder')}
                      placeholderTextColor={colors.textSecondary}
                      value={course.name}
                      onChangeText={(text) => updateCourse(index, 'name', text)}
                      maxLength={100}
                    />
                  </View>

                  <View>
                    <Text style={[commonStyles.label, { marginBottom: 8 }]}>
                      {i18n.t('createEvent.courseDescription')}
                    </Text>
                    <TextInput
                      style={[commonStyles.input, { height: 60, textAlignVertical: 'top' }]}
                      placeholder={i18n.t('createEvent.courseDescriptionPlaceholder')}
                      placeholderTextColor={colors.textSecondary}
                      value={course.description}
                      onChangeText={(text) => updateCourse(index, 'description', text)}
                      multiline
                      maxLength={200}
                    />
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>

          {/* Create Button */}
          <View style={{ padding: 20, backgroundColor: colors.background }}>
            <TouchableOpacity
              style={[buttonStyles.primary, { opacity: loading ? 0.7 : 1 }]}
              onPress={handleCreateEvent}
              disabled={loading}
            >
              {loading ? (
                <Text style={{ color: 'white', fontWeight: '600' }}>
                  {i18n.t('common.loading')}
                </Text>
              ) : (
                <>
                  <Icon name="plus" size={20} color="white" />
                  <Text style={{ color: 'white', marginLeft: 8, fontWeight: '600' }}>
                    {i18n.t('createEvent.createEvent')}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Floating Language Selector Bubble */}
          <View style={{
            position: 'absolute',
            bottom: 100,
            right: 20,
            zIndex: 1000,
          }}>
            <LanguageSelector isFloating={true} />
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
}

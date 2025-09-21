
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { commonStyles, colors, buttonStyles } from '../styles/commonStyles';
import { useAuth } from '../hooks/useAuth';
import { useEvents } from '../hooks/useEvents';
import { MenuCourse } from '../types';
import Icon from '../components/Icon';

const courseTypes = [
  { type: 'appetizer', label: 'Appetizer' },
  { type: 'first', label: 'First Course' },
  { type: 'main', label: 'Main Course' },
  { type: 'dessert', label: 'Dessert' },
  { type: 'cake', label: 'Cake' },
] as const;

export default function CreateEventScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { createEvent } = useEvents();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [menu, setMenu] = useState<Omit<MenuCourse, 'id' | 'isServed'>[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const addCourse = (type: typeof courseTypes[number]['type']) => {
    const newCourse = {
      name: courseTypes.find(c => c.type === type)?.label || '',
      type,
      description: '',
    };
    setMenu([...menu, newCourse]);
  };

  const removeCourse = (index: number) => {
    setMenu(menu.filter((_, i) => i !== index));
  };

  const updateCourse = (index: number, field: 'name' | 'description', value: string) => {
    const updatedMenu = [...menu];
    updatedMenu[index] = { ...updatedMenu[index], [field]: value };
    setMenu(updatedMenu);
  };

  const handleCreateEvent = async () => {
    if (!title || !location || menu.length === 0) {
      Alert.alert('Error', 'Please fill in all required fields and add at least one course');
      return;
    }

    if (!user) {
      Alert.alert('Error', 'You must be logged in to create an event');
      return;
    }

    setIsLoading(true);
    
    try {
      const result = await createEvent({
        title,
        description,
        date,
        location,
        menu,
      }, user);

      if (result.success) {
        Alert.alert('Success', 'Event created successfully!', [
          { text: 'OK', onPress: () => router.back() }
        ]);
      } else {
        Alert.alert('Error', result.error || 'Failed to create event');
      }
    } catch (error) {
      console.log('Create event error:', error);
      Alert.alert('Error', 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={commonStyles.container}>
      <View style={commonStyles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Icon name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[commonStyles.subtitle, { margin: 0 }]}>Create Event</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={commonStyles.content}>
        <View style={commonStyles.section}>
          <Text style={[commonStyles.text, { marginBottom: 8, fontWeight: '600' }]}>
            Event Title *
          </Text>
          <TextInput
            style={commonStyles.input}
            placeholder="Enter event title"
            value={title}
            onChangeText={setTitle}
          />

          <Text style={[commonStyles.text, { marginBottom: 8, fontWeight: '600' }]}>
            Description
          </Text>
          <TextInput
            style={[commonStyles.input, { height: 80, textAlignVertical: 'top' }]}
            placeholder="Enter event description"
            value={description}
            onChangeText={setDescription}
            multiline
          />

          <Text style={[commonStyles.text, { marginBottom: 8, fontWeight: '600' }]}>
            Location *
          </Text>
          <TextInput
            style={commonStyles.input}
            placeholder="Enter event location"
            value={location}
            onChangeText={setLocation}
          />

          <Text style={[commonStyles.text, { marginBottom: 8, fontWeight: '600' }]}>
            Date & Time *
          </Text>
          <TouchableOpacity
            style={[commonStyles.input, { justifyContent: 'center' }]}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={{ color: colors.text }}>
              {date.toLocaleDateString()} at {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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

        <View style={commonStyles.section}>
          <View style={[commonStyles.spaceBetween, { marginBottom: 16 }]}>
            <Text style={[commonStyles.subtitle, { margin: 0 }]}>
              Menu Courses *
            </Text>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {courseTypes.map(course => (
                <TouchableOpacity
                  key={course.type}
                  style={[buttonStyles.outline, { paddingHorizontal: 16, paddingVertical: 8 }]}
                  onPress={() => addCourse(course.type)}
                >
                  <Text style={{ color: colors.primary, fontSize: 14, fontWeight: '600' }}>
                    + {course.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {menu.map((course, index) => (
            <View key={index} style={commonStyles.smallCard}>
              <View style={[commonStyles.spaceBetween, { marginBottom: 12 }]}>
                <Text style={[commonStyles.text, { fontWeight: '600', color: colors.primary }]}>
                  {courseTypes.find(c => c.type === course.type)?.label}
                </Text>
                <TouchableOpacity onPress={() => removeCourse(index)}>
                  <Icon name="close" size={20} color={colors.error} />
                </TouchableOpacity>
              </View>
              
              <TextInput
                style={[commonStyles.input, { marginBottom: 8 }]}
                placeholder="Course name"
                value={course.name}
                onChangeText={(value) => updateCourse(index, 'name', value)}
              />
              
              <TextInput
                style={[commonStyles.input, { marginBottom: 0 }]}
                placeholder="Description (optional)"
                value={course.description}
                onChangeText={(value) => updateCourse(index, 'description', value)}
              />
            </View>
          ))}

          {menu.length === 0 && (
            <View style={commonStyles.card}>
              <Text style={[commonStyles.textSecondary, { textAlign: 'center' }]}>
                Add courses to your event menu using the buttons above
              </Text>
            </View>
          )}
        </View>

        <View style={[commonStyles.section, { paddingBottom: 40 }]}>
          <TouchableOpacity
            style={buttonStyles.primary}
            onPress={handleCreateEvent}
            disabled={isLoading}
          >
            <Text style={{ color: 'white', fontSize: 16, fontWeight: '600' }}>
              {isLoading ? 'Creating...' : 'Create Event'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

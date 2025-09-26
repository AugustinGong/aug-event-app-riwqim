
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Event } from '../types';
import { commonStyles, colors } from '../styles/commonStyles';
import Icon from './Icon';
import i18n from '../config/i18n';

interface EventCardProps {
  event: Event;
  onPress: () => void;
  isOrganizer?: boolean;
}

export default function EventCard({ event, onPress, isOrganizer = false }: EventCardProps) {
  const getEventTypeIcon = (eventType: string) => {
    const iconMap: { [key: string]: string } = {
      wedding: 'heart',
      birthday: 'gift',
      celebration: 'star',
      anniversary: 'calendar',
      graduation: 'award',
      corporate: 'briefcase',
      party: 'music',
      other: 'more-horizontal',
    };
    return iconMap[eventType] || 'star';
  };

  const getEventTypeColor = (eventType: string) => {
    const colorMap: { [key: string]: string } = {
      wedding: '#FF69B4',
      birthday: '#FFD700',
      celebration: '#8B5CF6',
      anniversary: '#FF6B6B',
      graduation: '#4ECDC4',
      corporate: '#45B7D1',
      party: '#96CEB4',
      other: '#95A5A6',
    };
    return colorMap[eventType] || '#8B5CF6';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return colors.success;
      case 'ended':
        return colors.textSecondary;
      default:
        return colors.primary;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return 'Live';
      case 'ended':
        return 'Ended';
      default:
        return 'Upcoming';
    }
  };

  return (
    <TouchableOpacity style={[commonStyles.card, { marginBottom: 15 }]} onPress={onPress}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
        <View style={{
          width: 50,
          height: 50,
          borderRadius: 25,
          backgroundColor: getEventTypeColor(event.eventType) + '20',
          justifyContent: 'center',
          alignItems: 'center',
          marginRight: 15,
        }}>
          <Icon name={getEventTypeIcon(event.eventType)} size={24} color={getEventTypeColor(event.eventType)} />
        </View>
        
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <Text style={[commonStyles.subtitle]} numberOfLines={1}>
              {event.title}
            </Text>
            <View style={{
              paddingHorizontal: 8,
              paddingVertical: 4,
              borderRadius: 12,
              backgroundColor: getStatusColor(event.status || 'upcoming') + '20',
            }}>
              <Text style={{
                fontSize: 10,
                fontWeight: '600',
                color: getStatusColor(event.status || 'upcoming'),
                textTransform: 'uppercase',
              }}>
                {getStatusText(event.status || 'upcoming')}
              </Text>
            </View>
          </View>
          
          <Text style={[commonStyles.textSecondary, { fontSize: 12, textTransform: 'capitalize', marginBottom: 4 }]}>
            {i18n.t(`eventTypes.${event.eventType}`)}
          </Text>
          
          {isOrganizer && (
            <View style={{
              paddingHorizontal: 6,
              paddingVertical: 2,
              borderRadius: 8,
              backgroundColor: colors.primaryLight,
              alignSelf: 'flex-start',
            }}>
              <Text style={{
                fontSize: 10,
                fontWeight: '600',
                color: colors.primary,
                textTransform: 'uppercase',
              }}>
                Organizer
              </Text>
            </View>
          )}
        </View>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
        <Icon name="calendar" size={14} color={colors.textSecondary} />
        <Text style={[commonStyles.textSecondary, { marginLeft: 6, fontSize: 12 }]}>
          {event.date.toLocaleDateString()} at {event.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
        <Icon name="map-pin" size={14} color={colors.textSecondary} />
        <Text style={[commonStyles.textSecondary, { marginLeft: 6, fontSize: 12 }]} numberOfLines={1}>
          {event.location}
        </Text>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Icon name="users" size={14} color={colors.textSecondary} />
          <Text style={[commonStyles.textSecondary, { marginLeft: 6, fontSize: 12 }]}>
            {event.participants?.length || 0} participants
          </Text>
        </View>
        
        {event.accessPassword && (
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Icon name="key" size={14} color={colors.textSecondary} />
            <Text style={[commonStyles.textSecondary, { marginLeft: 4, fontSize: 12, fontFamily: 'monospace' }]}>
              {event.accessPassword}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}


import React from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { commonStyles, colors } from '../styles/commonStyles';
import Icon from './Icon';
import { Event } from '../types';
import i18n from '../config/i18n';

interface EventCardProps {
  event: Event;
  onPress: () => void;
  isOrganizer: boolean;
  onDelete?: (eventId: string) => void;
}

export default function EventCard({ event, onPress, isOrganizer, onDelete }: EventCardProps) {
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
    const colorMap: { [key: string]: string } = {
      upcoming: colors.primary,
      active: colors.success,
      ended: colors.textSecondary,
      cancelled: colors.error,
    };
    return colorMap[status] || colors.textSecondary;
  };

  const getStatusIcon = (status: string) => {
    const iconMap: { [key: string]: string } = {
      upcoming: 'time',
      active: 'play-circle',
      ended: 'checkmark-circle',
      cancelled: 'close-circle',
    };
    return iconMap[status] || 'time';
  };

  const formatEventDate = (date: Date) => {
    const now = new Date();
    const eventDate = new Date(date);
    const diffTime = eventDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Tomorrow';
    } else if (diffDays > 0 && diffDays <= 7) {
      return `In ${diffDays} days`;
    } else if (diffDays < 0 && diffDays >= -7) {
      return `${Math.abs(diffDays)} days ago`;
    } else {
      return eventDate.toLocaleDateString();
    }
  };

  const handleDeletePress = (e: any) => {
    e.stopPropagation(); // Prevent triggering the card's onPress
    
    Alert.alert(
      i18n.t('event.deleteEvent'),
      i18n.t('event.confirmDeleteEvent'),
      [
        { text: i18n.t('common.cancel'), style: 'cancel' },
        {
          text: i18n.t('event.deleteEvent'),
          style: 'destructive',
          onPress: () => {
            if (onDelete) {
              onDelete(event.id);
            }
          },
        },
      ]
    );
  };

  const isCancelled = event.status === 'cancelled';

  return (
    <TouchableOpacity
      style={[
        commonStyles.card,
        { 
          marginBottom: 15,
          opacity: isCancelled ? 0.7 : 1,
          borderLeftWidth: 4,
          borderLeftColor: getStatusColor(event.status),
        }
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
        {/* Event Type Icon */}
        <View style={{
          width: 50,
          height: 50,
          borderRadius: 25,
          backgroundColor: getEventTypeColor(event.eventType) + '20',
          justifyContent: 'center',
          alignItems: 'center',
          marginRight: 15,
        }}>
          <Icon 
            name={getEventTypeIcon(event.eventType)} 
            size={24} 
            color={getEventTypeColor(event.eventType)} 
          />
        </View>

        {/* Event Details */}
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 5 }}>
            <Text style={[commonStyles.subtitle, { flex: 1, color: isCancelled ? colors.textSecondary : colors.text }]} numberOfLines={1}>
              {event.title}
            </Text>
            {isOrganizer && (
              <View style={{
                backgroundColor: colors.primaryLight,
                paddingHorizontal: 8,
                paddingVertical: 2,
                borderRadius: 12,
                marginLeft: 8,
              }}>
                <Text style={{ color: colors.primary, fontSize: 10, fontWeight: '600' }}>
                  ORGANIZER
                </Text>
              </View>
            )}
          </View>

          {/* Status and Date */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <Icon 
              name={getStatusIcon(event.status)} 
              size={14} 
              color={getStatusColor(event.status)} 
            />
            <Text style={[
              commonStyles.textSecondary, 
              { 
                marginLeft: 6, 
                fontSize: 12, 
                textTransform: 'capitalize',
                color: getStatusColor(event.status),
                fontWeight: '600'
              }
            ]}>
              {event.status}
            </Text>
            <Text style={[commonStyles.textSecondary, { marginLeft: 8, fontSize: 12 }]}>
              • {formatEventDate(event.date)}
            </Text>
          </View>

          {/* Location */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <Icon name="map-pin" size={14} color={colors.textSecondary} />
            <Text style={[commonStyles.textSecondary, { marginLeft: 6, fontSize: 12 }]} numberOfLines={1}>
              {event.location}
            </Text>
          </View>

          {/* Participants Count */}
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Icon name="people" size={14} color={colors.textSecondary} />
            <Text style={[commonStyles.textSecondary, { marginLeft: 6, fontSize: 12 }]}>
              {event.participants.length} participant{event.participants.length === 1 ? '' : 's'}
            </Text>
            {event.menu.length > 0 && (
              <>
                <Text style={[commonStyles.textSecondary, { marginLeft: 8, fontSize: 12 }]}>
                  • {event.menu.length} course{event.menu.length === 1 ? '' : 's'}
                </Text>
              </>
            )}
          </View>

          {/* Cancelled Status Message */}
          {isCancelled && (
            <View style={{ 
              marginTop: 10, 
              padding: 8, 
              backgroundColor: colors.errorLight, 
              borderRadius: 8,
              flexDirection: 'row',
              alignItems: 'center'
            }}>
              <Icon name="close-circle" size={14} color={colors.error} />
              <Text style={[commonStyles.textSecondary, { marginLeft: 6, fontSize: 11, color: colors.error }]}>
                {i18n.t('event.eventCancelledStatus')}
              </Text>
            </View>
          )}
        </View>

        {/* Action Buttons */}
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {/* Delete Button - Only visible to organizers */}
          {isOrganizer && onDelete && (
            <TouchableOpacity
              style={{
                padding: 8,
                marginRight: 8,
                borderRadius: 8,
                backgroundColor: colors.errorLight,
              }}
              onPress={handleDeletePress}
              activeOpacity={0.7}
            >
              <Icon name="trash-2" size={16} color={colors.error} />
            </TouchableOpacity>
          )}

          {/* Arrow Icon */}
          <Icon name="chevron-right" size={20} color={colors.textSecondary} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

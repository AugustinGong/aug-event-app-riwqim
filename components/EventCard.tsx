
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { commonStyles, colors } from '../styles/commonStyles';
import { Event } from '../types';
import Icon from './Icon';
import i18n from '../config/i18n';

interface EventCardProps {
  event: Event;
  onPress: () => void;
  isOrganizer?: boolean;
}

export default function EventCard({ event, onPress, isOrganizer }: EventCardProps) {
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString(i18n.locale, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = () => {
    if (event.status === 'active') return colors.success;
    if (event.status === 'ended') return colors.textSecondary;
    return colors.primary;
  };

  const getStatusText = () => {
    if (event.status === 'active') return i18n.t('event.eventStarted');
    if (event.status === 'ended') return i18n.t('event.eventEnded');
    return 'Upcoming';
  };

  return (
    <TouchableOpacity style={commonStyles.card} onPress={onPress}>
      <View style={commonStyles.spaceBetween}>
        <View style={{ flex: 1 }}>
          <Text style={[commonStyles.subtitle, { marginBottom: 4 }]}>
            {event.title}
          </Text>
          <Text style={[commonStyles.textSecondary, { marginBottom: 8 }]}>
            {formatDate(event.date)}
          </Text>
          <View style={commonStyles.centerRow}>
            <Icon name="map-pin" size={16} color={colors.textSecondary} />
            <Text style={[commonStyles.textSecondary, { marginLeft: 4 }]}>
              {event.location}
            </Text>
          </View>
        </View>
        
        <View style={{ alignItems: 'flex-end' }}>
          <View style={{
            backgroundColor: getStatusColor(),
            paddingHorizontal: 8,
            paddingVertical: 4,
            borderRadius: 12,
            marginBottom: 8,
          }}>
            <Text style={{ color: 'white', fontSize: 12, fontWeight: '600' }}>
              {getStatusText()}
            </Text>
          </View>
          
          {isOrganizer && (
            <View style={commonStyles.centerRow}>
              <Icon name="star" size={16} color={colors.primary} />
              <Text style={[commonStyles.textSecondary, { marginLeft: 4, fontSize: 12 }]}>
                Organizer
              </Text>
            </View>
          )}
          
          <View style={[commonStyles.centerRow, { marginTop: 4 }]}>
            <Icon name="people" size={16} color={colors.textSecondary} />
            <Text style={[commonStyles.textSecondary, { marginLeft: 4, fontSize: 12 }]}>
              {event.participants?.length || 0}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

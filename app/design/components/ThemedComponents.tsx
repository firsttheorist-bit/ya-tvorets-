// app/design/components/ThemedComponents.tsx
import React from 'react';
import { Pressable, Text, View, StyleSheet, ViewStyle, TextStyle, PressableProps } from 'react-native';
import { useMentorTheme } from '../mentorThemes';
import type { MentorId } from '../../mentorPhrases';

// Интерфейсы для пропсов
interface ThemedCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  mentorId?: MentorId;
  variant?: 'default' | 'outline' | 'filled';
}

interface ThemedButtonProps extends PressableProps {
  title: string;
  onPress: () => void;
  mentorId?: MentorId;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

interface ThemedTextProps {
  children: React.ReactNode;
  style?: TextStyle;
  mentorId?: MentorId;
  variant?: 'title' | 'subtitle' | 'body' | 'caption' | 'button';
}

// Карточка с темой
export function ThemedCard({ children, style, mentorId = 'lev', variant = 'default' }: ThemedCardProps) {
  const { styles, colors } = useMentorTheme(mentorId);
  
  const cardStyles = [
    styles.card,
    variant === 'outline' && { backgroundColor: 'transparent', borderColor: colors.primary },
    variant === 'filled' && { backgroundColor: colors.background3 },
    style,
  ];
  
  return <View style={cardStyles}>{children}</View>;
}

// Кнопка с темой
export function ThemedButton({
  title,
  onPress,
  mentorId = 'lev',
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  style,
  ...props
}: ThemedButtonProps) {
  const { styles, colors } = useMentorTheme(mentorId);
  
  const buttonStyles = [
    styles.button,
    variant === 'secondary' && { backgroundColor: colors.secondary },
    variant === 'outline' && { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.primary },
    size === 'sm' && { paddingVertical: 6, paddingHorizontal: 12 },
    size === 'lg' && { paddingVertical: 14, paddingHorizontal: 28 },
    (disabled || loading) && { opacity: 0.5 },
    style,
  ];
  
  const textStyles = [
    styles.buttonText,
    variant === 'outline' && { color: colors.primary },
    size === 'sm' && { fontSize: 12 },
    size === 'lg' && { fontSize: 16 },
  ];
  
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        buttonStyles,
        pressed && { opacity: 0.8 },
      ]}
      {...props}
    >
      <Text style={textStyles}>
        {loading ? '...' : title}
      </Text>
    </Pressable>
  );
}

// Текст с темой
export function ThemedText({ children, style, mentorId = 'lev', variant = 'body' }: ThemedTextProps) {
  const { styles } = useMentorTheme(mentorId);
  
  const textStyles = [
    styles.text,
    variant === 'title' && styles.title,
    variant === 'subtitle' && styles.subtitle,
    variant === 'caption' && styles.mutedText,
    variant === 'button' && styles.buttonText,
    style,
  ];
  
  return <Text style={textStyles}>{children}</Text>;
}

// Контейнер экрана с темой
export function ThemedScreen({ children, mentorId = 'lev' }: { children: React.ReactNode; mentorId?: MentorId }) {
  const { styles } = useMentorTheme(mentorId);
  
  return <View style={[styles.screen, { flex: 1 }]}>{children}</View>;
}

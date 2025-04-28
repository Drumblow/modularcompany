/**
 * NOTA: Este é um componente conceitual para referência futura.
 * Para implementação real, será necessário iniciar um projeto React Native/Expo separado.
 * As tipagens e importações estão comentadas para evitar erros durante o desenvolvimento web.
 */

import React from 'react';
// import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';

// Interface que representa as props que serão usadas na implementação real
interface ButtonProps {
  onPress: () => void;
  title: string;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon' | 'iconSm' | 'full';
  disabled?: boolean;
  // style?: ViewStyle;
  // textStyle?: TextStyle;
}

// Implementação conceitual do componente Button
export const Button: React.FC<ButtonProps> = ({
  onPress,
  title,
  variant = 'default',
  size = 'default',
  disabled = false,
  // style,
  // textStyle,
}) => {
  // Implementação completa será feita no projeto React Native
  console.log('Este componente é apenas para referência conceitual');
  
  return null; // Na implementação real, retornará um TouchableOpacity com estilos adequados
};

/**
 * Os estilos a seguir são uma referência para a implementação futura.
 * 
const styles = StyleSheet.create({
  button: {
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  text: {
    fontSize: 14,
    fontWeight: '500',
  },
  disabled: {
    opacity: 0.5,
  },
}); 
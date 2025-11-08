// React Native Error Boundary Component
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { darkTheme } from './theme';
import { logger } from './logger';
import { captureException } from './sentry';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Hata loglama
    logger.error('ErrorBoundary caught an error:', error);
    logger.error('Error Info:', errorInfo);
    
    // Sentry'ye gönder
    captureException(error, {
      errorInfo: errorInfo.componentStack,
      errorBoundary: true,
    });
    
    this.setState({
      error,
      errorInfo,
    });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI varsa onu kullan
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <View style={styles.container}>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.errorContainer}>
              <Text style={styles.errorTitle}>Bir Hata Oluştu</Text>
              <Text style={styles.errorMessage}>
                {this.state.error?.message || 'Bilinmeyen bir hata oluştu'}
              </Text>
              
              {__DEV__ && this.state.errorInfo && (
                <View style={styles.errorDetails}>
                  <Text style={styles.errorDetailsTitle}>Hata Detayları (Development):</Text>
                  <Text style={styles.errorDetailsText}>
                    {this.state.errorInfo.componentStack}
                  </Text>
                </View>
              )}
              
              <TouchableOpacity
                style={styles.resetButton}
                onPress={this.handleReset}
              >
                <Text style={styles.resetButtonText}>Tekrar Dene</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: darkTheme.colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorContainer: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: darkTheme.colors.surface,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  errorTitle: {
    ...darkTheme.typography.title,
    color: darkTheme.colors.error,
    marginBottom: 12,
    textAlign: 'center',
  },
  errorMessage: {
    ...darkTheme.typography.body,
    color: darkTheme.colors.text,
    marginBottom: 24,
    textAlign: 'center',
  },
  errorDetails: {
    width: '100%',
    marginBottom: 24,
    padding: 12,
    backgroundColor: darkTheme.colors.background,
    borderRadius: 8,
  },
  errorDetailsTitle: {
    ...darkTheme.typography.caption,
    color: darkTheme.colors.textSecondary,
    marginBottom: 8,
    fontWeight: '600',
  },
  errorDetailsText: {
    ...darkTheme.typography.caption,
    color: darkTheme.colors.textSecondary,
    fontSize: 10,
    fontFamily: 'monospace',
  },
  resetButton: {
    backgroundColor: darkTheme.colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 150,
  },
  resetButtonText: {
    ...darkTheme.typography.body,
    color: '#FFFFFF',
    fontWeight: '600',
    textAlign: 'center',
  },
});


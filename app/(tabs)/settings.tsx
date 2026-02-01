import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSizes, BorderRadius, Shadows } from '../../src/constants/theme';
import { Card } from '../../src/components/ui';
import { useModel } from '../../src/context';

export default function SettingsScreen() {
  const { modelInfo, isReady } = useModel();
  const [saveHistory, setSaveHistory] = React.useState(true);
  const [highAccuracyMode, setHighAccuracyMode] = React.useState(false);

  const handleClearHistory = () => {
    Alert.alert(
      'Clear History',
      'Are you sure you want to clear all scan history? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            // Clear history from database
            Alert.alert('Success', 'Scan history cleared');
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* App Info */}
      <Card style={styles.card}>
        <View style={styles.appHeader}>
          <View style={styles.appIcon}>
            <Ionicons name="leaf" size={32} color={Colors.textLight} />
          </View>
          <View>
            <Text style={styles.appName}>AgroGuard</Text>
            <Text style={styles.appVersion}>Version 1.0.0</Text>
          </View>
        </View>
        <Text style={styles.appDescription}>
          Offline plant disease detection powered by on-device AI
        </Text>
      </Card>

      {/* Model Status */}
      <Text style={styles.sectionTitle}>ML Models</Text>
      <Card style={styles.card}>
        <View style={styles.statusRow}>
          <Ionicons
            name={isReady ? 'checkmark-circle' : 'time'}
            size={24}
            color={isReady ? Colors.success : Colors.warning}
          />
          <Text style={styles.statusText}>
            {isReady ? 'Models Loaded' : 'Loading Models...'}
          </Text>
        </View>
        {modelInfo && (
          <View style={styles.modelInfo}>
            <View style={styles.modelItem}>
              <Text style={styles.modelLabel}>Crop Classifier</Text>
              <Text style={styles.modelValue}>
                {modelInfo.crop.numClasses} classes
              </Text>
            </View>
            <View style={styles.modelItem}>
              <Text style={styles.modelLabel}>Disease Detector</Text>
              <Text style={styles.modelValue}>
                {modelInfo.disease.numClasses} classes
              </Text>
            </View>
          </View>
        )}
      </Card>

      {/* Preferences */}
      <Text style={styles.sectionTitle}>Preferences</Text>
      <Card style={styles.card}>
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Save Scan History</Text>
            <Text style={styles.settingDescription}>
              Keep a record of all your scans
            </Text>
          </View>
          <Switch
            value={saveHistory}
            onValueChange={setSaveHistory}
            trackColor={{ true: Colors.primary }}
            thumbColor={Colors.surface}
          />
        </View>
        <View style={styles.divider} />
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>High Accuracy Mode</Text>
            <Text style={styles.settingDescription}>
              Use more processing power for better results
            </Text>
          </View>
          <Switch
            value={highAccuracyMode}
            onValueChange={setHighAccuracyMode}
            trackColor={{ true: Colors.primary }}
            thumbColor={Colors.surface}
          />
        </View>
      </Card>

      {/* Data Management */}
      <Text style={styles.sectionTitle}>Data</Text>
      <Card style={styles.card}>
        <TouchableOpacity style={styles.actionRow} onPress={handleClearHistory}>
          <Ionicons name="trash-outline" size={24} color={Colors.error} />
          <Text style={[styles.actionText, { color: Colors.error }]}>
            Clear Scan History
          </Text>
        </TouchableOpacity>
      </Card>

      {/* About */}
      <Text style={styles.sectionTitle}>About</Text>
      <Card style={styles.card}>
        <TouchableOpacity style={styles.actionRow}>
          <Ionicons name="information-circle-outline" size={24} color={Colors.primary} />
          <Text style={styles.actionText}>How it works</Text>
          <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
        </TouchableOpacity>
        <View style={styles.divider} />
        <TouchableOpacity style={styles.actionRow}>
          <Ionicons name="document-text-outline" size={24} color={Colors.primary} />
          <Text style={styles.actionText}>Privacy Policy</Text>
          <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
        </TouchableOpacity>
        <View style={styles.divider} />
        <TouchableOpacity style={styles.actionRow}>
          <Ionicons name="star-outline" size={24} color={Colors.primary} />
          <Text style={styles.actionText}>Rate the App</Text>
          <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
        </TouchableOpacity>
      </Card>

      <Text style={styles.footer}>
        Made with care for farmers worldwide
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  card: {
    marginBottom: Spacing.md,
  },
  appHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  appIcon: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  appName: {
    fontSize: FontSizes.xl,
    fontWeight: '700',
    color: Colors.text,
  },
  appVersion: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  appDescription: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  sectionTitle: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    marginBottom: Spacing.sm,
    marginTop: Spacing.md,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  statusText: {
    fontSize: FontSizes.md,
    fontWeight: '500',
    color: Colors.text,
  },
  modelInfo: {
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  modelItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modelLabel: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  modelValue: {
    fontSize: FontSizes.sm,
    color: Colors.text,
    fontWeight: '500',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.xs,
  },
  settingInfo: {
    flex: 1,
    marginRight: Spacing.md,
  },
  settingLabel: {
    fontSize: FontSizes.md,
    fontWeight: '500',
    color: Colors.text,
  },
  settingDescription: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.sm,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  actionText: {
    flex: 1,
    fontSize: FontSizes.md,
    color: Colors.text,
  },
  footer: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.xl,
  },
});

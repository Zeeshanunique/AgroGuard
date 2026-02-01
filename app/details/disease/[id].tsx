import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSizes, BorderRadius } from '../../../src/constants/theme';
import { Card } from '../../../src/components/ui';
import { DISEASE_LABELS, CROP_LABELS } from '../../../src/ml/labels';

// Mock treatment data
const getMockTreatments = (isHealthy: boolean) => {
  if (isHealthy) return { organic: [], chemical: [] };

  return {
    organic: [
      {
        name: 'Neem Oil Spray',
        description: 'Natural fungicide derived from neem tree',
        dosage: '2-4 tbsp per gallon of water',
        application: 'Spray every 7-14 days',
      },
      {
        name: 'Baking Soda Solution',
        description: 'Creates alkaline environment',
        dosage: '1 tbsp per gallon with liquid soap',
        application: 'Weekly foliar spray',
      },
    ],
    chemical: [
      {
        name: 'Chlorothalonil',
        description: 'Broad-spectrum fungicide',
        dosage: 'Per manufacturer instructions',
        application: 'Every 7-10 days during disease pressure',
      },
    ],
  };
};

export default function DiseaseDetailScreen() {
  const { id } = useLocalSearchParams();
  const diseaseId = parseInt(id as string, 10);
  const disease = DISEASE_LABELS[diseaseId];
  const [activeTab, setActiveTab] = useState<'organic' | 'chemical'>('organic');

  if (!disease) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Disease not found</Text>
      </View>
    );
  }

  const crop = CROP_LABELS[disease.cropIndex];
  const treatments = getMockTreatments(disease.isHealthy);

  return (
    <>
      <Stack.Screen options={{ title: disease.name }} />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View
            style={[
              styles.iconContainer,
              disease.isHealthy ? styles.healthyContainer : styles.diseasedContainer,
            ]}
          >
            <Ionicons
              name={disease.isHealthy ? 'checkmark-circle' : 'warning'}
              size={48}
              color={disease.isHealthy ? Colors.healthy : Colors.diseased}
            />
          </View>
          <Text style={styles.name}>{disease.name}</Text>
          <View style={styles.cropBadge}>
            <Ionicons name="leaf" size={14} color={Colors.primary} />
            <Text style={styles.cropText}>{crop?.name || 'Unknown Crop'}</Text>
          </View>
          {!disease.isHealthy && (
            <View
              style={[
                styles.severityBadge,
                { backgroundColor: getSeverityColor(disease.severity) + '20' },
              ]}
            >
              <Text
                style={[styles.severityText, { color: getSeverityColor(disease.severity) }]}
              >
                {disease.severity.charAt(0).toUpperCase() + disease.severity.slice(1)} Severity
              </Text>
            </View>
          )}
        </View>

        {/* Status */}
        <Card
          style={[
            styles.statusCard,
            disease.isHealthy ? styles.healthyCard : styles.diseasedCard,
          ]}
        >
          <Text style={styles.statusTitle}>
            {disease.isHealthy ? 'Healthy Plant' : 'Disease Detected'}
          </Text>
          <Text style={styles.statusDescription}>
            {disease.isHealthy
              ? 'This represents a healthy state of the plant. No treatment is necessary - continue regular care and maintenance.'
              : 'This condition requires attention. Review the treatment options below to help manage and cure the disease.'}
          </Text>
        </Card>

        {/* Treatments (only for diseases) */}
        {!disease.isHealthy && (
          <>
            <Text style={styles.sectionTitle}>Treatment Options</Text>

            {/* Tabs */}
            <View style={styles.tabContainer}>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'organic' && styles.activeTab]}
                onPress={() => setActiveTab('organic')}
              >
                <Ionicons
                  name="leaf"
                  size={18}
                  color={activeTab === 'organic' ? Colors.organic : Colors.textSecondary}
                />
                <Text
                  style={[styles.tabText, activeTab === 'organic' && styles.activeTabText]}
                >
                  Organic ({treatments.organic.length})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'chemical' && styles.activeTab]}
                onPress={() => setActiveTab('chemical')}
              >
                <Ionicons
                  name="flask"
                  size={18}
                  color={activeTab === 'chemical' ? Colors.chemical : Colors.textSecondary}
                />
                <Text
                  style={[styles.tabText, activeTab === 'chemical' && styles.activeTabText]}
                >
                  Chemical ({treatments.chemical.length})
                </Text>
              </TouchableOpacity>
            </View>

            {/* Treatment List */}
            {treatments[activeTab].length > 0 ? (
              treatments[activeTab].map((treatment, index) => (
                <Card key={index} style={styles.treatmentCard}>
                  <Text style={styles.treatmentName}>{treatment.name}</Text>
                  <Text style={styles.treatmentDescription}>{treatment.description}</Text>

                  <View style={styles.treatmentDetail}>
                    <Ionicons name="beaker" size={16} color={Colors.primary} />
                    <View style={styles.detailContent}>
                      <Text style={styles.detailLabel}>Dosage</Text>
                      <Text style={styles.detailText}>{treatment.dosage}</Text>
                    </View>
                  </View>

                  <View style={styles.treatmentDetail}>
                    <Ionicons name="time" size={16} color={Colors.primary} />
                    <View style={styles.detailContent}>
                      <Text style={styles.detailLabel}>Application</Text>
                      <Text style={styles.detailText}>{treatment.application}</Text>
                    </View>
                  </View>
                </Card>
              ))
            ) : (
              <Card style={styles.emptyCard}>
                <Text style={styles.emptyText}>
                  No {activeTab} treatments available.
                </Text>
              </Card>
            )}
          </>
        )}

        {/* Prevention Tips */}
        <Text style={styles.sectionTitle}>Prevention Tips</Text>
        <Card style={styles.tipsCard}>
          <TipItem icon="water" text="Avoid overwatering and ensure proper drainage" />
          <TipItem icon="sunny" text="Provide adequate sunlight and air circulation" />
          <TipItem icon="trash" text="Remove infected plant debris promptly" />
          <TipItem icon="swap-horizontal" text="Practice crop rotation when possible" />
          <TipItem icon="eye" text="Monitor plants regularly for early symptoms" />
        </Card>
      </ScrollView>
    </>
  );
}

function TipItem({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={styles.tipItem}>
      <Ionicons name={icon as any} size={18} color={Colors.primary} />
      <Text style={styles.tipText}>{text}</Text>
    </View>
  );
}

function getSeverityColor(severity: string): string {
  switch (severity) {
    case 'critical':
      return Colors.error;
    case 'high':
      return Colors.diseased;
    case 'medium':
      return Colors.warning;
    case 'low':
      return Colors.success;
    default:
      return Colors.textSecondary;
  }
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
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontSize: FontSizes.lg,
    color: Colors.error,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  healthyContainer: {
    backgroundColor: Colors.healthy + '20',
  },
  diseasedContainer: {
    backgroundColor: Colors.diseased + '20',
  },
  name: {
    fontSize: FontSizes.xxl,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
  },
  cropBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    backgroundColor: Colors.primaryLight + '20',
    borderRadius: BorderRadius.full,
    gap: Spacing.xs,
  },
  cropText: {
    fontSize: FontSizes.sm,
    color: Colors.primary,
    fontWeight: '500',
  },
  severityBadge: {
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  severityText: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
  },
  statusCard: {
    marginBottom: Spacing.lg,
  },
  healthyCard: {
    borderLeftWidth: 4,
    borderLeftColor: Colors.healthy,
  },
  diseasedCard: {
    borderLeftWidth: 4,
    borderLeftColor: Colors.diseased,
  },
  statusTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  statusDescription: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.md,
    marginTop: Spacing.sm,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xs,
    marginBottom: Spacing.md,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
  },
  activeTab: {
    backgroundColor: Colors.primaryLight + '20',
  },
  tabText: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
  },
  activeTabText: {
    color: Colors.primary,
    fontWeight: '600',
  },
  treatmentCard: {
    marginBottom: Spacing.md,
  },
  treatmentName: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  treatmentDescription: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
  treatmentDetail: {
    flexDirection: 'row',
    marginBottom: Spacing.sm,
  },
  detailContent: {
    flex: 1,
    marginLeft: Spacing.sm,
  },
  detailLabel: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.text,
  },
  detailText: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  emptyCard: {
    alignItems: 'center',
    padding: Spacing.xl,
  },
  emptyText: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
  },
  tipsCard: {
    gap: Spacing.sm,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  tipText: {
    flex: 1,
    fontSize: FontSizes.md,
    color: Colors.text,
  },
});

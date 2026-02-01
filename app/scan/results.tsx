import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSizes, BorderRadius, Shadows } from '../../src/constants/theme';
import { Card, ConfidenceBar, Button } from '../../src/components/ui';

// Mock treatment data - in production, this would come from the database
const getMockTreatments = (diseaseName: string, isHealthy: boolean) => {
  if (isHealthy) {
    return {
      organic: [
        {
          name: 'Preventive Care',
          description: 'Continue regular maintenance to keep your plant healthy',
          application: 'Regular watering and proper nutrition',
          dosage: 'As needed based on soil moisture',
          precautions: ['Avoid overwatering', 'Ensure proper drainage'],
        },
      ],
      chemical: [],
    };
  }

  return {
    organic: [
      {
        name: 'Neem Oil Spray',
        description: 'Natural fungicide derived from neem tree seeds',
        application: 'Spray on affected leaves every 7-14 days',
        dosage: '2-4 tablespoons per gallon of water',
        precautions: ['Avoid spraying in direct sunlight', 'Test on small area first'],
        effectiveness: 'Medium',
      },
      {
        name: 'Baking Soda Solution',
        description: 'Creates alkaline environment unfavorable to fungus',
        application: 'Spray weekly on affected leaves',
        dosage: '1 tbsp baking soda + 1 tsp liquid soap per gallon water',
        precautions: ['Do not use in excess', 'May affect soil pH'],
        effectiveness: 'Low-Medium',
      },
      {
        name: 'Crop Rotation',
        description: 'Prevent disease buildup by rotating crops each season',
        application: 'Plant different crop families in same location each year',
        dosage: 'N/A',
        precautions: ['Plan 3-4 year rotation cycles'],
        effectiveness: 'High (preventive)',
      },
    ],
    chemical: [
      {
        name: 'Chlorothalonil',
        description: 'Broad-spectrum contact fungicide',
        application: 'Spray every 7-10 days during disease pressure',
        dosage: 'Follow manufacturer label instructions',
        precautions: [
          'Wear protective equipment',
          'Keep away from water sources',
          'Observe pre-harvest interval',
          'Not for organic production',
        ],
        effectiveness: 'High',
      },
      {
        name: 'Copper Fungicide',
        description: 'Preventive and early-stage disease control',
        application: 'Apply before or at first sign of disease',
        dosage: 'Per label - typically 1-4 tbsp per gallon',
        precautions: [
          'Can accumulate in soil',
          'Avoid application during hot weather',
          'Some formulations are organic-approved',
        ],
        effectiveness: 'Medium-High',
      },
    ],
  };
};

export default function ResultsScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'organic' | 'chemical'>('organic');

  const imageUri = params.imageUri as string;
  const cropName = params.cropName as string;
  const cropConfidence = parseFloat(params.cropConfidence as string);
  const diseaseName = params.diseaseName as string;
  const diseaseConfidence = parseFloat(params.diseaseConfidence as string);
  const isHealthy = params.isHealthy === 'true';
  const severity = params.severity as string;
  const inferenceTime = params.inferenceTime as string;

  const treatments = getMockTreatments(diseaseName, isHealthy);

  const handleScanAgain = () => {
    router.replace('/scan/camera');
  };

  const handleGoHome = () => {
    router.replace('/(tabs)');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Image Preview */}
      <View style={styles.imageContainer}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.image} />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Ionicons name="leaf" size={48} color={Colors.primary} />
          </View>
        )}
        <View style={styles.inferenceTime}>
          <Ionicons name="flash" size={14} color={Colors.textLight} />
          <Text style={styles.inferenceTimeText}>{inferenceTime}ms</Text>
        </View>
      </View>

      {/* Crop Result */}
      <Card style={styles.resultCard}>
        <View style={styles.resultHeader}>
          <View style={styles.resultIcon}>
            <Ionicons name="leaf" size={24} color={Colors.primary} />
          </View>
          <View style={styles.resultInfo}>
            <Text style={styles.resultLabel}>Identified Crop</Text>
            <Text style={styles.resultValue}>{cropName}</Text>
          </View>
        </View>
        <ConfidenceBar confidence={cropConfidence} label="Confidence" />
      </Card>

      {/* Disease Result */}
      <Card style={[styles.resultCard, isHealthy ? styles.healthyCard : styles.diseasedCard]}>
        <View style={styles.resultHeader}>
          <View style={[styles.resultIcon, isHealthy ? styles.healthyIcon : styles.diseasedIcon]}>
            <Ionicons
              name={isHealthy ? 'checkmark-circle' : 'warning'}
              size={24}
              color={isHealthy ? Colors.healthy : Colors.diseased}
            />
          </View>
          <View style={styles.resultInfo}>
            <Text style={styles.resultLabel}>Disease Detection</Text>
            <Text style={styles.resultValue}>{diseaseName}</Text>
            {!isHealthy && severity && (
              <View style={styles.severityBadge}>
                <Text style={styles.severityText}>
                  Severity: {severity.charAt(0).toUpperCase() + severity.slice(1)}
                </Text>
              </View>
            )}
          </View>
        </View>
        <ConfidenceBar confidence={diseaseConfidence} label="Confidence" />
      </Card>

      {/* Health Status */}
      {isHealthy ? (
        <Card style={styles.statusCard}>
          <Ionicons name="happy" size={48} color={Colors.healthy} />
          <Text style={styles.statusTitle}>Your plant looks healthy!</Text>
          <Text style={styles.statusText}>
            Continue with regular care and maintenance to keep it thriving.
          </Text>
        </Card>
      ) : (
        <>
          {/* Treatment Tabs */}
          <Text style={styles.sectionTitle}>Treatment Recommendations</Text>
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
                Organic
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
                Chemical
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
                  <Ionicons name="color-wand" size={16} color={Colors.primary} />
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>Application</Text>
                    <Text style={styles.detailText}>{treatment.application}</Text>
                  </View>
                </View>

                <View style={styles.treatmentDetail}>
                  <Ionicons name="beaker" size={16} color={Colors.primary} />
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>Dosage</Text>
                    <Text style={styles.detailText}>{treatment.dosage}</Text>
                  </View>
                </View>

                {treatment.precautions.length > 0 && (
                  <View style={styles.precautionsContainer}>
                    <Text style={styles.precautionsTitle}>Precautions</Text>
                    {treatment.precautions.map((precaution, i) => (
                      <View key={i} style={styles.precautionItem}>
                        <Ionicons name="alert-circle" size={14} color={Colors.warning} />
                        <Text style={styles.precautionText}>{precaution}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {treatment.effectiveness && (
                  <View style={styles.effectivenessBadge}>
                    <Text style={styles.effectivenessText}>
                      Effectiveness: {treatment.effectiveness}
                    </Text>
                  </View>
                )}
              </Card>
            ))
          ) : (
            <Card style={styles.emptyCard}>
              <Text style={styles.emptyText}>
                No {activeTab} treatments available for this disease.
              </Text>
            </Card>
          )}
        </>
      )}

      {/* Actions */}
      <View style={styles.actions}>
        <Button
          title="Scan Another"
          onPress={handleScanAgain}
          variant="outline"
          style={styles.actionButton}
        />
        <Button
          title="Go Home"
          onPress={handleGoHome}
          style={styles.actionButton}
        />
      </View>
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
  imageContainer: {
    height: 200,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    marginBottom: Spacing.md,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.primaryLight + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inferenceTime: {
    position: 'absolute',
    bottom: Spacing.sm,
    right: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    gap: 4,
  },
  inferenceTimeText: {
    color: Colors.textLight,
    fontSize: FontSizes.xs,
  },
  resultCard: {
    marginBottom: Spacing.md,
  },
  healthyCard: {
    borderLeftWidth: 4,
    borderLeftColor: Colors.healthy,
  },
  diseasedCard: {
    borderLeftWidth: 4,
    borderLeftColor: Colors.diseased,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  resultIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primaryLight + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  healthyIcon: {
    backgroundColor: Colors.healthy + '20',
  },
  diseasedIcon: {
    backgroundColor: Colors.diseased + '20',
  },
  resultInfo: {
    flex: 1,
  },
  resultLabel: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  resultValue: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    color: Colors.text,
  },
  severityBadge: {
    backgroundColor: Colors.warning + '20',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    alignSelf: 'flex-start',
    marginTop: Spacing.xs,
  },
  severityText: {
    fontSize: FontSizes.xs,
    color: Colors.warning,
    fontWeight: '500',
  },
  statusCard: {
    alignItems: 'center',
    padding: Spacing.xl,
    marginBottom: Spacing.md,
  },
  statusTitle: {
    fontSize: FontSizes.xl,
    fontWeight: '600',
    color: Colors.healthy,
    marginTop: Spacing.md,
  },
  statusText: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.sm,
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
    ...Shadows.sm,
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
  precautionsContainer: {
    backgroundColor: Colors.warning + '10',
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.sm,
  },
  precautionsTitle: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.warning,
    marginBottom: Spacing.xs,
  },
  precautionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.xs,
    marginTop: 4,
  },
  precautionText: {
    flex: 1,
    fontSize: FontSizes.sm,
    color: Colors.text,
  },
  effectivenessBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.primary + '20',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    marginTop: Spacing.sm,
  },
  effectivenessText: {
    fontSize: FontSizes.xs,
    color: Colors.primary,
    fontWeight: '500',
  },
  emptyCard: {
    alignItems: 'center',
    padding: Spacing.xl,
  },
  emptyText: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.lg,
  },
  actionButton: {
    flex: 1,
  },
});

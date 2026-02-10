import React, { useState, useMemo } from 'react';
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
import { useDatabase } from '../../src/context';
import { TreatmentData, DiseaseData } from '../../src/database';

export default function ResultsScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const db = useDatabase();
  const [activeTab, setActiveTab] = useState<'organic' | 'chemical'>('organic');

  const imageUri = params.imageUri as string;
  const cropName = params.cropName as string;
  const cropConfidence = parseFloat(params.cropConfidence as string);
  const diseaseName = params.diseaseName as string;
  const diseaseConfidence = parseFloat(params.diseaseConfidence as string);
  const isHealthy = params.isHealthy === 'true';
  const severity = params.severity as string;
  const inferenceTime = params.inferenceTime as string;

  // Get real treatments from database
  const { organicTreatments, chemicalTreatments, diseaseInfo } = useMemo(() => {
    // Try exact match first: crop + disease name
    let treatments = db.getTreatmentsForDisease(cropName, diseaseName);
    let info: DiseaseData | undefined = db.getDiseaseByName(cropName, diseaseName);

    // If no match, try fuzzy search across all crops
    if (treatments.length === 0 && !isHealthy) {
      const found = db.findDisease(diseaseName);
      if (found) {
        treatments = found.disease.treatments;
        info = found.disease;
      }
    }

    return {
      organicTreatments: treatments.filter(t => t.type === 'organic'),
      chemicalTreatments: treatments.filter(t => t.type === 'chemical'),
      diseaseInfo: info,
    };
  }, [cropName, diseaseName, isHealthy]);

  const treatments = activeTab === 'organic' ? organicTreatments : chemicalTreatments;

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
      {/* Disease Info from DB */}
      {diseaseInfo && !isHealthy && diseaseInfo.symptoms && (
        <Card style={styles.resultCard}>
          <Text style={styles.sectionTitle}>Symptoms</Text>
          {diseaseInfo.symptoms.map((symptom, i) => (
            <View key={i} style={styles.symptomItem}>
              <Ionicons name="ellipse" size={6} color={Colors.primary} />
              <Text style={styles.symptomText}>{symptom}</Text>
            </View>
          ))}
          {diseaseInfo.causes && (
            <>
              <Text style={[styles.sectionTitle, { marginTop: Spacing.md }]}>Cause</Text>
              <Text style={styles.causeText}>{diseaseInfo.causes}</Text>
            </>
          )}
        </Card>
      )}

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
                Organic ({organicTreatments.length})
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
                Chemical ({chemicalTreatments.length})
              </Text>
            </TouchableOpacity>
          </View>

          {/* Treatment List */}
          {treatments.length > 0 ? (
            treatments.map((treatment, index) => (
              <Card key={index} style={styles.treatmentCard}>
                <Text style={styles.treatmentName}>{treatment.name}</Text>
                <Text style={styles.treatmentDescription}>{treatment.description}</Text>

                <View style={styles.treatmentDetail}>
                  <Ionicons name="color-wand" size={16} color={Colors.primary} />
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>Application</Text>
                    <Text style={styles.detailText}>{treatment.applicationMethod}</Text>
                  </View>
                </View>

                <View style={styles.treatmentDetail}>
                  <Ionicons name="beaker" size={16} color={Colors.primary} />
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>Dosage</Text>
                    <Text style={styles.detailText}>{treatment.dosage}</Text>
                  </View>
                </View>

                {treatment.frequency && (
                  <View style={styles.treatmentDetail}>
                    <Ionicons name="repeat" size={16} color={Colors.primary} />
                    <View style={styles.detailContent}>
                      <Text style={styles.detailLabel}>Frequency</Text>
                      <Text style={styles.detailText}>{treatment.frequency}</Text>
                    </View>
                  </View>
                )}

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

                <View style={styles.treatmentMeta}>
                  <View style={styles.effectivenessBadge}>
                    <Text style={styles.effectivenessText}>
                      Effectiveness: {treatment.effectiveness.charAt(0).toUpperCase() + treatment.effectiveness.slice(1)}
                    </Text>
                  </View>
                  {treatment.costLevel && (
                    <View style={[styles.effectivenessBadge, { backgroundColor: Colors.textSecondary + '15' }]}>
                      <Text style={[styles.effectivenessText, { color: Colors.textSecondary }]}>
                        Cost: {treatment.costLevel.charAt(0).toUpperCase() + treatment.costLevel.slice(1)}
                      </Text>
                    </View>
                  )}
                </View>
              </Card>
            ))
          ) : (
            <Card style={styles.emptyCard}>
              <Text style={styles.emptyText}>
                No {activeTab} treatments available for this disease.
              </Text>
            </Card>
          )}

          {/* Prevention */}
          {diseaseInfo?.prevention && (
            <>
              <Text style={styles.sectionTitle}>Prevention</Text>
              <Card>
                <Text style={styles.causeText}>{diseaseInfo.prevention}</Text>
              </Card>
            </>
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
  treatmentMeta: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
    flexWrap: 'wrap',
  },
  effectivenessBadge: {
    backgroundColor: Colors.primary + '20',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  effectivenessText: {
    fontSize: FontSizes.xs,
    color: Colors.primary,
    fontWeight: '500',
  },
  symptomItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  symptomText: {
    flex: 1,
    fontSize: FontSizes.md,
    color: Colors.text,
  },
  causeText: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    lineHeight: 22,
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

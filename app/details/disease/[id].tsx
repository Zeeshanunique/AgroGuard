import React, { useState, useMemo } from 'react';
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
import { useDatabase } from '../../../src/context';

export default function DiseaseDetailScreen() {
  const params = useLocalSearchParams<{
    id: string;
    cropName?: string;
    diseaseName?: string;
  }>();
  const rawId = params.id || '';
  const cropNameParam = params.cropName;
  const diseaseNameParam = params.diseaseName;
  const db = useDatabase();
  const [activeTab, setActiveTab] = useState<'organic' | 'chemical'>('organic');

  const isSeedRoute = rawId === 'seed';

  const seedDisease = useMemo(() => {
    if (!isSeedRoute || !cropNameParam || !diseaseNameParam) return undefined;
    return db.getDiseaseByName(cropNameParam, diseaseNameParam);
  }, [isSeedRoute, cropNameParam, diseaseNameParam, db]);

  const mlDisease = useMemo(() => {
    if (isSeedRoute) return undefined;
    const n = parseInt(rawId, 10);
    if (Number.isNaN(n)) return undefined;
    return DISEASE_LABELS[n];
  }, [isSeedRoute, rawId]);

  const disease = isSeedRoute
    ? seedDisease
      ? {
          name: seedDisease.name,
          isHealthy: seedDisease.isHealthy,
          severity: String(seedDisease.severity),
        }
      : null
    : mlDisease ?? null;

  const crop = useMemo(() => {
    if (isSeedRoute && cropNameParam) {
      return (
        Object.values(CROP_LABELS).find(
          c => c.name.toLowerCase() === cropNameParam.toLowerCase(),
        ) ?? { name: cropNameParam, scientificName: '', category: '' }
      );
    }
    if (!mlDisease) return undefined;
    return CROP_LABELS[mlDisease.cropIndex];
  }, [isSeedRoute, cropNameParam, mlDisease]);

  const { organicTreatments, chemicalTreatments, diseaseInfo } = useMemo(() => {
    if (isSeedRoute && seedDisease) {
      const t = seedDisease.treatments;
      return {
        organicTreatments: t.filter(treat => treat.type === 'organic'),
        chemicalTreatments: t.filter(treat => treat.type === 'chemical'),
        diseaseInfo: seedDisease,
      };
    }
    if (!mlDisease) {
      return { organicTreatments: [], chemicalTreatments: [], diseaseInfo: undefined };
    }
    const cropName = crop?.name || '';
    const diseaseName = mlDisease.name;
    // ML labels are prefixed: "Pumpkin Healthy" → strip to "Healthy" for seed lookup
    const shortName = diseaseName.startsWith(cropName + ' ')
      ? diseaseName.slice(cropName.length + 1)
      : diseaseName;

    let found = db.getDiseaseByName(cropName, shortName) ?? db.getDiseaseByName(cropName, diseaseName);
    let allTreatments = found?.treatments || [];

    if (allTreatments.length === 0 && !mlDisease.isHealthy) {
      // Scope fuzzy search to the correct crop to avoid cross-crop false matches
      const cropDiseases = db.getDiseasesForCrop(cropName);
      const fuzzyInCrop = cropDiseases.find(d =>
        shortName.toLowerCase().includes(d.name.toLowerCase()) ||
        d.name.toLowerCase().includes(shortName.toLowerCase())
      );
      if (fuzzyInCrop) {
        allTreatments = fuzzyInCrop.treatments;
        found = fuzzyInCrop;
      }
    }

    return {
      organicTreatments: allTreatments.filter(t => t.type === 'organic'),
      chemicalTreatments: allTreatments.filter(t => t.type === 'chemical'),
      diseaseInfo: found,
    };
  }, [isSeedRoute, seedDisease, mlDisease, crop, db]);

  if (!disease) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Disease not found</Text>
      </View>
    );
  }

  const treatments = activeTab === 'organic' ? organicTreatments : chemicalTreatments;

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
            {diseaseInfo?.description ||
              (disease.isHealthy
                ? 'This represents a healthy state of the plant. No treatment is necessary - continue regular care and maintenance.'
                : 'This condition requires attention. Review the treatment options below to help manage and cure the disease.')}
          </Text>
        </Card>

        {/* Symptoms from DB */}
        {diseaseInfo && !disease.isHealthy && diseaseInfo.symptoms && diseaseInfo.symptoms.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Symptoms</Text>
            <Card style={styles.symptomsCard}>
              {diseaseInfo.symptoms.map((symptom, i) => (
                <View key={i} style={styles.symptomItem}>
                  <Ionicons name="ellipse" size={6} color={Colors.diseased} />
                  <Text style={styles.symptomText}>{symptom}</Text>
                </View>
              ))}
            </Card>
          </>
        )}

        {/* Cause */}
        {diseaseInfo?.causes && (
          <>
            <Text style={styles.sectionTitle}>Cause</Text>
            <Card>
              <Text style={styles.statusDescription}>{diseaseInfo.causes}</Text>
            </Card>
          </>
        )}

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
                      {treatment.precautions.map((p, i) => (
                        <View key={i} style={styles.precautionItem}>
                          <Ionicons name="alert-circle" size={14} color={Colors.warning} />
                          <Text style={styles.precautionText}>{p}</Text>
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
                  No {activeTab} treatments available.
                </Text>
              </Card>
            )}
          </>
        )}

        {/* Prevention Tips */}
        <Text style={styles.sectionTitle}>Prevention Tips</Text>
        <Card style={styles.tipsCard}>
          {diseaseInfo?.prevention ? (
            <Text style={styles.statusDescription}>{diseaseInfo.prevention}</Text>
          ) : (
            <>
              <TipItem icon="water" text="Avoid overwatering and ensure proper drainage" />
              <TipItem icon="sunny" text="Provide adequate sunlight and air circulation" />
              <TipItem icon="trash" text="Remove infected plant debris promptly" />
              <TipItem icon="swap-horizontal" text="Practice crop rotation when possible" />
              <TipItem icon="eye" text="Monitor plants regularly for early symptoms" />
            </>
          )}
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
  symptomsCard: {
    marginBottom: Spacing.md,
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

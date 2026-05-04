import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSizes, BorderRadius, Shadows } from '../../../src/constants/theme';
import { Card } from '../../../src/components/ui';
import { CROP_LABELS, DISEASE_LABELS, isPlantVillageCropIndex } from '../../../src/ml/labels';
import { useDatabase } from '../../../src/context';

type CropDiseaseRow = {
  key: string;
  name: string;
  isHealthy: boolean;
  severity: string;
  source: 'ml' | 'seed';
  mlClassId?: string;
};

export default function CropDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const db = useDatabase();
  const cropId = parseInt(id as string, 10);
  const crop = CROP_LABELS[cropId];

  const diseases = useMemo((): CropDiseaseRow[] => {
    if (!crop) return [];
    const mlRows: CropDiseaseRow[] = Object.entries(DISEASE_LABELS)
      .filter(([_, disease]) => disease.cropIndex === cropId)
      .map(([diseaseId, disease]) => ({
        key: `ml-${diseaseId}`,
        name: disease.name,
        isHealthy: disease.isHealthy,
        severity: disease.severity,
        source: 'ml',
        mlClassId: diseaseId,
      }));
    if (isPlantVillageCropIndex(cropId)) {
      return mlRows;
    }
    const seedRows: CropDiseaseRow[] = db.getDiseasesForCrop(crop.name).map(d => ({
      key: `seed-${d.name}`,
      name: d.name,
      isHealthy: d.isHealthy,
      severity: d.severity,
      source: 'seed',
    }));
    return seedRows;
  }, [crop, cropId, db]);

  if (!crop) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Crop not found</Text>
      </View>
    );
  }

  const inModel = isPlantVillageCropIndex(cropId);

  const handleDiseasePress = (row: CropDiseaseRow) => {
    if (row.source === 'ml' && row.mlClassId != null) {
      router.push(`/details/disease/${row.mlClassId}`);
      return;
    }
    router.push({
      pathname: '/details/disease/[id]',
      params: { id: 'seed', cropName: crop.name, diseaseName: row.name },
    });
  };

  return (
    <>
      <Stack.Screen options={{ title: crop.name }} />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {!inModel && (
          <View style={styles.warnBanner}>
            <Ionicons name="warning-outline" size={20} color={Colors.warning} />
            <Text style={styles.warnText}>
              This crop is not classified on-device. The scanner only supports the 14 PlantVillage species; Browse may list extra reference crops.
            </Text>
          </View>
        )}
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Ionicons name="leaf" size={48} color={Colors.primary} />
          </View>
          <Text style={styles.name}>{crop.name}</Text>
          <Text style={styles.scientificName}>{crop.scientificName}</Text>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{crop.category}</Text>
          </View>
        </View>

        {/* Quick Facts */}
        <Card style={styles.factsCard}>
          <Text style={styles.sectionTitle}>Quick Facts</Text>
          <View style={styles.factRow}>
            <View style={styles.factItem}>
              <Ionicons name="bug" size={24} color={Colors.primary} />
              <Text style={styles.factValue}>{diseases.length}</Text>
              <Text style={styles.factLabel}>Known Diseases</Text>
            </View>
            <View style={styles.factItem}>
              <Ionicons name="checkmark-circle" size={24} color={Colors.healthy} />
              <Text style={styles.factValue}>
                {diseases.filter(d => d.isHealthy).length}
              </Text>
              <Text style={styles.factLabel}>Healthy States</Text>
            </View>
            <View style={styles.factItem}>
              <Ionicons name="warning" size={24} color={Colors.diseased} />
              <Text style={styles.factValue}>
                {diseases.filter(d => !d.isHealthy).length}
              </Text>
              <Text style={styles.factLabel}>Disease Types</Text>
            </View>
          </View>
        </Card>

        {/* Diseases */}
        <Text style={styles.sectionTitle}>Associated Conditions</Text>
        {diseases.map(row => (
          <TouchableOpacity
            key={row.key}
            onPress={() => handleDiseasePress(row)}
            activeOpacity={0.7}
          >
            <Card style={styles.diseaseCard}>
              <View style={styles.diseaseHeader}>
                <View
                  style={[
                    styles.diseaseIcon,
                    row.isHealthy ? styles.healthyIcon : styles.diseasedIcon,
                  ]}
                >
                  <Ionicons
                    name={row.isHealthy ? 'checkmark' : 'close'}
                    size={20}
                    color={row.isHealthy ? Colors.healthy : Colors.diseased}
                  />
                </View>
                <View style={styles.diseaseInfo}>
                  <Text style={styles.diseaseName}>{row.name}</Text>
                  {!row.isHealthy && (
                    <View style={styles.severityContainer}>
                      <SeverityIndicator severity={row.severity} />
                    </View>
                  )}
                </View>
                <Ionicons name="chevron-forward" size={24} color={Colors.textSecondary} />
              </View>
            </Card>
          </TouchableOpacity>
        ))}

        {diseases.length === 0 && (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyText}>
              No disease data available for this crop yet.
            </Text>
          </Card>
        )}
      </ScrollView>
    </>
  );
}

function SeverityIndicator({ severity }: { severity: string }) {
  const getSeverityColor = () => {
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
  };

  return (
    <View style={[styles.severityBadge, { backgroundColor: getSeverityColor() + '20' }]}>
      <Text style={[styles.severityText, { color: getSeverityColor() }]}>
        {severity.charAt(0).toUpperCase() + severity.slice(1)} severity
      </Text>
    </View>
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
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontSize: FontSizes.lg,
    color: Colors.error,
  },
  warnBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    backgroundColor: Colors.warning + '18',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.warning + '55',
  },
  warnText: {
    flex: 1,
    fontSize: FontSizes.sm,
    color: Colors.text,
    lineHeight: FontSizes.sm * 1.35,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.primaryLight + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  name: {
    fontSize: FontSizes.xxl,
    fontWeight: '700',
    color: Colors.text,
  },
  scientificName: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    marginTop: Spacing.xs,
  },
  categoryBadge: {
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.full,
  },
  categoryText: {
    fontSize: FontSizes.sm,
    color: Colors.textLight,
    fontWeight: '500',
  },
  factsCard: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  factRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: Spacing.sm,
  },
  factItem: {
    alignItems: 'center',
  },
  factValue: {
    fontSize: FontSizes.xl,
    fontWeight: '700',
    color: Colors.text,
    marginTop: Spacing.xs,
  },
  factLabel: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  diseaseCard: {
    marginBottom: Spacing.sm,
  },
  diseaseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  diseaseIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
  diseaseInfo: {
    flex: 1,
  },
  diseaseName: {
    fontSize: FontSizes.md,
    fontWeight: '500',
    color: Colors.text,
  },
  severityContainer: {
    marginTop: Spacing.xs,
  },
  severityBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  severityText: {
    fontSize: FontSizes.xs,
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
});

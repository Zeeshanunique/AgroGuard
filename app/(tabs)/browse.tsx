import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSizes, BorderRadius, Shadows } from '../../src/constants/theme';
import {
  CROP_LABELS,
  DISEASE_LABELS,
  PLANTVILLAGE_MODEL_SCOPE,
  isPlantVillageCropIndex,
} from '../../src/ml/labels';

const diseaseCountByCrop: { [cropIndex: number]: number } = {};
Object.values(DISEASE_LABELS).forEach(d => {
  diseaseCountByCrop[d.cropIndex] = (diseaseCountByCrop[d.cropIndex] || 0) + 1;
});

const crops = Object.entries(CROP_LABELS)
  .filter(([id]) => isPlantVillageCropIndex(parseInt(id, 10)))
  .map(([id, crop]) => ({
    id,
    ...crop,
    diseaseCount: diseaseCountByCrop[parseInt(id, 10)] || 0,
  }))
  .sort((a, b) => b.diseaseCount - a.diseaseCount || a.name.localeCompare(b.name));

const categories = ['All', ...new Set(crops.map(c => c.category))];

export default function BrowseScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const filteredCrops = crops.filter(crop => {
    const matchesSearch =
      crop.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      crop.scientificName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || crop.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleCropPress = (cropId: string) => {
    router.push(`/details/crop/${cropId}`);
  };

  return (
    <View style={styles.container}>
      <View style={styles.hintBanner}>
        <Ionicons name="information-circle-outline" size={18} color={Colors.primary} />
        <Text style={styles.hintText}>
          {PLANTVILLAGE_MODEL_SCOPE} Tap a crop for disease classes.
        </Text>
      </View>

      <View style={styles.controlsCard}>
        <View style={styles.searchRow}>
          <Ionicons name="search" size={20} color={Colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search crops..."
            placeholderTextColor={Colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={8}>
              <Ionicons name="close-circle" size={22} color={Colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        <Text style={styles.filterLabel}>Category</Text>
        <View style={styles.chipsWrap}>
          {categories.map(item => (
            <TouchableOpacity
              key={item}
              style={[
                styles.categoryChip,
                selectedCategory === item && styles.categoryChipActive,
              ]}
              onPress={() => setSelectedCategory(item)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.categoryText,
                  selectedCategory === item && styles.categoryTextActive,
                ]}
              >
                {item}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <FlatList
        data={filteredCrops}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        numColumns={2}
        columnWrapperStyle={styles.row}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.cropCard}
            onPress={() => handleCropPress(item.id)}
            activeOpacity={0.7}
          >
            <View style={styles.modelBadge}>
              <Ionicons name="hardware-chip" size={11} color={Colors.textLight} />
              <Text style={styles.modelBadgeText}>
                {item.diseaseCount} {item.diseaseCount === 1 ? 'class' : 'classes'}
              </Text>
            </View>
            <View style={styles.cropIconContainer}>
              <Ionicons name="leaf" size={32} color={Colors.primary} />
            </View>
            <Text style={styles.cropName}>{item.name}</Text>
            <Text style={styles.cropScientific} numberOfLines={1}>
              {item.scientificName}
            </Text>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryBadgeText}>{item.category}</Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="leaf-outline" size={48} color={Colors.textSecondary} />
            <Text style={styles.emptyText}>No crops found</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  hintBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    backgroundColor: Colors.primaryLight + '18',
    marginHorizontal: Spacing.md,
    marginTop: Spacing.sm,
    padding: Spacing.sm + 2,
    borderRadius: BorderRadius.md,
  },
  hintText: {
    flex: 1,
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  controlsCard: {
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border + '80',
    ...Shadows.sm,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchInput: {
    flex: 1,
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.sm,
    fontSize: FontSizes.md,
    color: Colors.text,
    minHeight: 44,
  },
  filterLabel: {
    fontSize: FontSizes.xs,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
    letterSpacing: 0.4,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  categoryChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  categoryChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  categoryText: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  categoryTextActive: {
    color: Colors.textLight,
    fontWeight: '600',
  },
  listContainer: {
    padding: Spacing.md,
    paddingTop: Spacing.md,
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  cropCard: {
    width: '48%',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.primary + '25',
    ...Shadows.sm,
  },
  modelBadge: {
    position: 'absolute',
    top: Spacing.xs,
    right: Spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xs + 2,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    gap: 3,
  },
  modelBadgeText: {
    fontSize: 9,
    color: Colors.textLight,
    fontWeight: '700',
  },
  cropIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primaryLight + '30',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  cropName: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.text,
    textAlign: 'center',
  },
  cropScientific: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    marginTop: 2,
    textAlign: 'center',
  },
  categoryBadge: {
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    backgroundColor: Colors.primaryLight + '20',
    borderRadius: BorderRadius.sm,
  },
  categoryBadgeText: {
    fontSize: FontSizes.xs,
    color: Colors.primary,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxl,
  },
  emptyText: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
  },
});

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSizes, BorderRadius } from '../../src/constants/theme';
import { Button } from '../../src/components/ui';
import { modelManager } from '../../src/ml';
import { useDatabase } from '../../src/context';

export default function CameraScreen() {
  const router = useRouter();
  const db = useDatabase();
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('back');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  if (!permission) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Ionicons name="camera-outline" size={64} color={Colors.textSecondary} />
        <Text style={styles.permissionTitle}>Camera Access Needed</Text>
        <Text style={styles.permissionText}>
          AgroGuard needs camera access to scan plant leaves for disease detection.
        </Text>
        <Button title="Grant Permission" onPress={requestPermission} />
      </View>
    );
  }

  const takePicture = async () => {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.8,
        });
        if (photo) {
          setCapturedImage(photo.uri);
        }
      } catch (error) {
        console.error('Failed to take picture:', error);
        Alert.alert('Error', 'Failed to take picture. Please try again.');
      }
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: true,
      aspect: [1, 1],
    });

    if (!result.canceled && result.assets[0]) {
      setCapturedImage(result.assets[0].uri);
    }
  };

  const analyzeImage = async () => {
    if (!capturedImage) return;

    setIsAnalyzing(true);
    try {
      const result = await modelManager.analyze(capturedImage);

      // Check if we got valid predictions
      if (!result.cropPrediction || !result.diseasePrediction) {
        throw new Error('No predictions returned from model');
      }

      // Save to scan history
      const savedScan = await db.addScanToHistory({
        imageUri: capturedImage,
        cropName: result.cropPrediction.className,
        diseaseName: result.diseasePrediction.className,
        cropConfidence: result.cropPrediction.confidence,
        diseaseConfidence: result.diseasePrediction.confidence,
        isHealthy: result.diseasePrediction.isHealthy || false,
        severity: result.diseasePrediction.severity || 'unknown',
        scannedAt: new Date(),
      });

      // Navigate to results with the analysis data
      router.replace({
        pathname: '/scan/results',
        params: {
          scanId: savedScan.id,
          imageUri: capturedImage,
          cropName: result.cropPrediction.className,
          cropConfidence: result.cropPrediction.confidence.toString(),
          diseaseName: result.diseasePrediction.className,
          diseaseConfidence: result.diseasePrediction.confidence.toString(),
          isHealthy: result.diseasePrediction.isHealthy ? 'true' : 'false',
          severity: result.diseasePrediction.severity || 'unknown',
          inferenceTime: result.inferenceTimeMs.toString(),
        },
      });
    } catch (error) {
      console.error('Analysis failed:', error);
      Alert.alert('Analysis Failed', error instanceof Error ? error.message : 'Failed to analyze the image. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const retake = () => {
    setCapturedImage(null);
  };

  const toggleFacing = () => {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  };

  if (capturedImage) {
    return (
      <View style={styles.container}>
        <Image source={{ uri: capturedImage }} style={styles.preview} />

        <View style={styles.previewOverlay}>
          <Text style={styles.previewTitle}>Preview</Text>
          <Text style={styles.previewSubtitle}>
            Make sure the leaf is clearly visible
          </Text>
        </View>

        <View style={styles.previewActions}>
          <Button
            title="Retake"
            onPress={retake}
            variant="outline"
            style={styles.actionButton}
            disabled={isAnalyzing}
          />
          <Button
            title={isAnalyzing ? 'Analyzing...' : 'Analyze'}
            onPress={analyzeImage}
            loading={isAnalyzing}
            style={styles.actionButton}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing={facing}
      >
        {/* Guide Frame */}
        <View style={styles.guideContainer}>
          <View style={styles.guideFrame}>
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />
          </View>
          <Text style={styles.guideText}>Position the leaf within the frame</Text>
        </View>

        {/* Controls */}
        <View style={styles.controls}>
          <TouchableOpacity style={styles.controlButton} onPress={pickImage}>
            <Ionicons name="images" size={28} color={Colors.textLight} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.captureButton} onPress={takePicture}>
            <View style={styles.captureInner} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.controlButton} onPress={toggleFacing}>
            <Ionicons name="camera-reverse" size={28} color={Colors.textLight} />
          </TouchableOpacity>
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.text,
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  permissionTitle: {
    fontSize: FontSizes.xl,
    fontWeight: '600',
    color: Colors.text,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  permissionText: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  camera: {
    flex: 1,
  },
  guideContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guideFrame: {
    width: 280,
    height: 280,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: Colors.textLight,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopLeftRadius: BorderRadius.md,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderTopRightRadius: BorderRadius.md,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: BorderRadius.md,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: BorderRadius.md,
  },
  guideText: {
    color: Colors.textLight,
    fontSize: FontSizes.md,
    marginTop: Spacing.lg,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingBottom: Spacing.xxl,
    paddingHorizontal: Spacing.xl,
  },
  controlButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.textLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.textLight,
    borderWidth: 3,
    borderColor: Colors.text,
  },
  preview: {
    flex: 1,
    resizeMode: 'cover',
  },
  previewOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    padding: Spacing.xl,
    paddingTop: Spacing.xxl,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  previewTitle: {
    fontSize: FontSizes.xl,
    fontWeight: '600',
    color: Colors.textLight,
  },
  previewSubtitle: {
    fontSize: FontSizes.md,
    color: Colors.textLight,
    opacity: 0.8,
    marginTop: Spacing.xs,
  },
  previewActions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    gap: Spacing.md,
  },
  actionButton: {
    flex: 1,
  },
});

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  PanResponder,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSizes, BorderRadius } from '../../src/constants/theme';
import { Button } from '../../src/components/ui';
import { modelManager } from '../../src/ml';
import { useDatabase } from '../../src/context';

const DEFAULT_CROP_SIZE = 220;
const MIN_CROP_SIZE = 120;
const CROP_STEP = 30;

export default function CameraScreen() {
  const router = useRouter();
  const db = useDatabase();
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('back');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  const [naturalSize, setNaturalSize] = useState({ w: 0, h: 0 });
  const [layoutSize, setLayoutSize] = useState({ w: 0, h: 0 });
  const [cropSize, setCropSize] = useState(DEFAULT_CROP_SIZE);

  const pan = useRef(new Animated.ValueXY()).current;
  const pos = useRef({ x: 0, y: 0 });
  const gestureStart = useRef({ x: 0, y: 0 });
  const displayArea = useRef({ ox: 0, oy: 0, dw: 0, dh: 0 });
  const cropSizeRef = useRef(DEFAULT_CROP_SIZE);

  useEffect(() => {
    cropSizeRef.current = cropSize;
  }, [cropSize]);

  const computeDisplayArea = useCallback(() => {
    if (!naturalSize.w || !layoutSize.w) return;
    const sx = layoutSize.w / naturalSize.w;
    const sy = layoutSize.h / naturalSize.h;
    const s = Math.min(sx, sy);
    const dw = naturalSize.w * s;
    const dh = naturalSize.h * s;
    const ox = (layoutSize.w - dw) / 2;
    const oy = (layoutSize.h - dh) / 2;
    displayArea.current = { ox, oy, dw, dh };
    return { ox, oy, dw, dh };
  }, [naturalSize, layoutSize]);

  useEffect(() => {
    const area = computeDisplayArea();
    if (!area) return;

    const maxSize = Math.min(area.dw, area.dh) - 20;
    const size = Math.min(cropSizeRef.current, maxSize);
    setCropSize(size);
    cropSizeRef.current = size;

    const cx = area.ox + (area.dw - size) / 2;
    const cy = area.oy + (area.dh - size) / 2;
    pos.current = { x: cx, y: cy };
    pan.setValue({ x: cx, y: cy });
  }, [naturalSize, layoutSize, computeDisplayArea, pan]);

  const clamp = useCallback(
    (x: number, y: number) => {
      const { ox, oy, dw, dh } = displayArea.current;
      const s = cropSizeRef.current;
      return {
        x: Math.max(ox, Math.min(x, ox + dw - s)),
        y: Math.max(oy, Math.min(y, oy + dh - s)),
      };
    },
    [],
  );

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, { dx, dy }) =>
        Math.abs(dx) > 2 || Math.abs(dy) > 2,
      onPanResponderGrant: () => {
        gestureStart.current = { ...pos.current };
      },
      onPanResponderMove: (_, { dx, dy }) => {
        const { ox, oy, dw, dh } = displayArea.current;
        const s = cropSizeRef.current;
        const nx = Math.max(ox, Math.min(gestureStart.current.x + dx, ox + dw - s));
        const ny = Math.max(oy, Math.min(gestureStart.current.y + dy, oy + dh - s));
        pan.setValue({ x: nx, y: ny });
      },
      onPanResponderRelease: (_, { dx, dy }) => {
        const { ox, oy, dw, dh } = displayArea.current;
        const s = cropSizeRef.current;
        const nx = Math.max(ox, Math.min(gestureStart.current.x + dx, ox + dw - s));
        const ny = Math.max(oy, Math.min(gestureStart.current.y + dy, oy + dh - s));
        pos.current = { x: nx, y: ny };
      },
    }),
  ).current;

  const adjustCropSize = (delta: number) => {
    const { dw, dh } = displayArea.current;
    const maxSize = Math.min(dw, dh) - 20;
    const newSize = Math.max(MIN_CROP_SIZE, Math.min(cropSizeRef.current + delta, maxSize));
    setCropSize(newSize);
    cropSizeRef.current = newSize;

    const clamped = clamp(pos.current.x, pos.current.y);
    pos.current = clamped;
    pan.setValue(clamped);
  };

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
        const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });
        if (photo) {
          setCapturedImage(photo.uri);
          if (photo.width && photo.height) {
            setNaturalSize({ w: photo.width, h: photo.height });
          }
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
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setCapturedImage(asset.uri);
      if (asset.width && asset.height) {
        setNaturalSize({ w: asset.width, h: asset.height });
      }
    }
  };

  const cropAndAnalyze = async () => {
    if (!capturedImage) return;

    setIsAnalyzing(true);
    try {
      const { ox, oy, dw } = displayArea.current;
      const scale = naturalSize.w / dw;

      const originX = Math.max(0, Math.round((pos.current.x - ox) * scale));
      const originY = Math.max(0, Math.round((pos.current.y - oy) * scale));
      const cropW = Math.min(Math.round(cropSize * scale), naturalSize.w - originX);
      const cropH = Math.min(Math.round(cropSize * scale), naturalSize.h - originY);

      const cropped = await ImageManipulator.manipulateAsync(
        capturedImage,
        [{ crop: { originX, originY, width: cropW, height: cropH } }],
        { format: ImageManipulator.SaveFormat.JPEG, compress: 0.8 },
      );

      const result = await modelManager.analyze(cropped.uri);

      if (!result.cropPrediction || !result.diseasePrediction) {
        throw new Error('No predictions returned from model');
      }

      const savedScan = await db.addScanToHistory({
        imageUri: cropped.uri,
        cropName: result.cropPrediction.className,
        diseaseName: result.diseasePrediction.className,
        cropConfidence: result.cropPrediction.confidence,
        diseaseConfidence: result.diseasePrediction.confidence,
        isHealthy: result.diseasePrediction.isHealthy || false,
        severity: result.diseasePrediction.severity || 'unknown',
        scannedAt: new Date(),
      });

      router.replace({
        pathname: '/scan/results',
        params: {
          scanId: savedScan.id,
          imageUri: cropped.uri,
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
      Alert.alert(
        'Analysis Failed',
        error instanceof Error
          ? error.message
          : 'Failed to analyze the image. Please try again.',
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const retake = () => {
    setCapturedImage(null);
    setNaturalSize({ w: 0, h: 0 });
    setLayoutSize({ w: 0, h: 0 });
    setCropSize(DEFAULT_CROP_SIZE);
  };

  const toggleFacing = () => {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  };

  if (capturedImage) {
    return (
      <View style={styles.container}>
        <View
          style={styles.cropContainer}
          onLayout={(e) => {
            const { width, height } = e.nativeEvent.layout;
            setLayoutSize({ w: width, h: height });
          }}
        >
          <Image
            source={{ uri: capturedImage }}
            style={StyleSheet.absoluteFill}
            resizeMode="contain"
          />

          <Animated.View
            style={[
              styles.cropBox,
              {
                width: cropSize,
                height: cropSize,
                transform: [{ translateX: pan.x }, { translateY: pan.y }],
              },
            ]}
            {...panResponder.panHandlers}
          >
            <View style={[styles.cropCorner, styles.cTopLeft]} />
            <View style={[styles.cropCorner, styles.cTopRight]} />
            <View style={[styles.cropCorner, styles.cBottomLeft]} />
            <View style={[styles.cropCorner, styles.cBottomRight]} />
          </Animated.View>
        </View>

        <View style={styles.cropHeader}>
          <View style={styles.cropHeaderRow}>
            <Ionicons name="crop-outline" size={20} color={Colors.textLight} />
            <Text style={styles.cropTitle}>Crop Image</Text>
          </View>
          <Text style={styles.cropSubtitle}>Drag the box to focus on the leaf</Text>
        </View>

        <View style={styles.sizeControls}>
          <TouchableOpacity
            style={styles.sizeButton}
            onPress={() => adjustCropSize(-CROP_STEP)}
          >
            <Ionicons name="remove" size={22} color={Colors.textLight} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.sizeButton}
            onPress={() => adjustCropSize(CROP_STEP)}
          >
            <Ionicons name="add" size={22} color={Colors.textLight} />
          </TouchableOpacity>
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
            title={isAnalyzing ? 'Analyzing...' : 'Crop & Analyze'}
            onPress={cropAndAnalyze}
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
        style={StyleSheet.absoluteFill}
        facing={facing}
      />

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
  guideContainer: {
    ...StyleSheet.absoluteFillObject,
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
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
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
  cropContainer: {
    flex: 1,
  },
  cropBox: {
    position: 'absolute',
    top: 0,
    left: 0,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.85)',
  },
  cropCorner: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: Colors.primary,
  },
  cTopLeft: {
    top: -2,
    left: -2,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 4,
  },
  cTopRight: {
    top: -2,
    right: -2,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 4,
  },
  cBottomLeft: {
    bottom: -2,
    left: -2,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 4,
  },
  cBottomRight: {
    bottom: -2,
    right: -2,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 4,
  },
  cropHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingTop: Spacing.xxl,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  cropHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  cropTitle: {
    fontSize: FontSizes.xl,
    fontWeight: '600',
    color: Colors.textLight,
  },
  cropSubtitle: {
    fontSize: FontSizes.sm,
    color: Colors.textLight,
    opacity: 0.75,
    marginTop: 2,
  },
  sizeControls: {
    position: 'absolute',
    right: Spacing.md,
    top: '45%',
    gap: Spacing.sm,
  },
  sizeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  previewActions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    gap: Spacing.md,
  },
  actionButton: {
    flex: 1,
  },
});

// Reusable UI primitives for DzSwoopa

import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import { Heart, MapPin, Store, BadgeCheck, Fuel, Gauge, Settings2, Calendar } from "lucide-react-native";
import { memo, useCallback } from "react";
import { Pressable, StyleSheet, Text, View, type ViewStyle } from "react-native";
import { theme } from "@/constants/theme";
import { formatPrice, formatRelativeTime, getCarMake } from "@/lib/api";
import type { CarListing } from "@/types/car";

type CardProps = {
  car: CarListing;
  isFavorite: boolean;
  onToggleFavorite: (car: CarListing) => void;
  onPress: (car: CarListing) => void;
  style?: ViewStyle;
};

function CarCardBase({ car, isFavorite, onToggleFavorite, onPress, style }: CardProps) {
  const handleFav = useCallback(() => {
    onToggleFavorite(car);
  }, [car, onToggleFavorite]);

  const handlePress = useCallback(() => {
    onPress(car);
  }, [car, onPress]);

  const make = getCarMake(car.title);
  const price = formatPrice(car.price, car.pricePreview, car.priceUnit);

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.card,
        style,
        pressed && styles.cardPressed,
      ]}
    >
      {/* Image */}
      <View style={styles.imageWrap}>
        {car.imageUrl ? (
          <Image
            source={{ uri: car.imageUrl }}
            style={styles.image}
            contentFit="cover"
            transition={200}
            recyclingKey={car.id}
          />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Text style={styles.placeholderText}>Pas d'image</Text>
          </View>
        )}

        {/* Gradient overlay for legibility */}
        <LinearGradient
          colors={["transparent", "rgba(10,14,26,0.7)"]}
          locations={[0.5, 1]}
          style={styles.imageGradient}
        />

        {/* Make badge */}
        <View style={styles.makeBadge}>
          <Text style={styles.makeText}>{make}</Text>
        </View>

        {/* Favorite button */}
        <Pressable
          onPress={handleFav}
          hitSlop={12}
          style={({ pressed }) => [
            styles.favButton,
            pressed && styles.favPressed,
          ]}
        >
          <Heart
            size={18}
            color={isFavorite ? theme.accentBright : theme.text}
            fill={isFavorite ? theme.accentBright : "transparent"}
            strokeWidth={2.5}
          />
        </Pressable>

        {/* Price banner */}
        <View style={styles.priceBanner}>
          <Text style={styles.priceText} numberOfLines={1}>
            {price}
          </Text>
          {car.oldPrice != null && car.oldPrice > 0 && (
            <Text style={styles.oldPriceText}>
              {car.oldPricePreview ?? car.oldPrice.toLocaleString("fr-DZ")} DA
            </Text>
          )}
        </View>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={2}>
          {car.title}
        </Text>

        {/* Specs row */}
        <View style={styles.specs}>
          {car.year && (
            <View style={styles.specItem}>
              <Calendar size={12} color={theme.textMuted} />
              <Text style={styles.specText}>{car.year}</Text>
            </View>
          )}
          {car.mileage && (
            <View style={styles.specItem}>
              <Gauge size={12} color={theme.textMuted} />
              <Text style={styles.specText} numberOfLines={1}>
                {car.mileage}
              </Text>
            </View>
          )}
          {car.fuel && (
            <View style={styles.specItem}>
              <Fuel size={12} color={theme.textMuted} />
              <Text style={styles.specText} numberOfLines={1}>
                {car.fuel}
              </Text>
            </View>
          )}
          {car.gearbox && (
            <View style={styles.specItem}>
              <Settings2 size={12} color={theme.textMuted} />
              <Text style={styles.specText} numberOfLines={1}>
                {car.gearbox}
              </Text>
            </View>
          )}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.locationRow}>
            {car.cityName && (
              <>
                <MapPin size={11} color={theme.accent} />
                <Text style={styles.locationText} numberOfLines={1}>
                  {car.cityName}
                  {car.regionName ? `, ${car.regionName}` : ""}
                </Text>
              </>
            )}
          </View>
          <View style={styles.footerRight}>
            {car.isFromStore && car.storeName && (
              <View style={styles.storeBadge}>
                {car.storeVerified ? (
                  <BadgeCheck size={11} color={theme.teal} />
                ) : (
                  <Store size={11} color={theme.textMuted} />
                )}
                <Text style={styles.storeText} numberOfLines={1}>
                  {car.storeName}
                </Text>
              </View>
            )}
            <Text style={styles.timeText}>
              {formatRelativeTime(car.createdAt)}
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

export const CarCard = memo(CarCardBase);

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.card,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: theme.border,
  },
  cardPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
  imageWrap: {
    position: "relative",
    height: 180,
    backgroundColor: theme.bgElevated,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  imagePlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.bgElevated,
  },
  placeholderText: {
    color: theme.textMuted,
    fontSize: 13,
  },
  imageGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
  },
  makeBadge: {
    position: "absolute",
    top: 10,
    left: 10,
    backgroundColor: "rgba(10,14,26,0.75)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(232,112,58,0.3)",
  },
  makeText: {
    color: theme.accentBright,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  favButton: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(10,14,26,0.7)",
    alignItems: "center",
    justifyContent: "center",
  },
  favPressed: {
    transform: [{ scale: 0.85 }],
  },
  priceBanner: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingBottom: 8,
    gap: 8,
  },
  priceText: {
    color: theme.text,
    fontSize: 16,
    fontWeight: "800",
    flexShrink: 1,
  },
  oldPriceText: {
    color: theme.textMuted,
    fontSize: 11,
    textDecorationLine: "line-through",
  },
  content: {
    padding: 12,
    gap: 8,
  },
  title: {
    color: theme.text,
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 18,
  },
  specs: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  specItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  specText: {
    color: theme.textSecondary,
    fontSize: 11,
    maxWidth: 70,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    flexShrink: 1,
  },
  locationText: {
    color: theme.textSecondary,
    fontSize: 11,
    flexShrink: 1,
  },
  footerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexShrink: 0,
  },
  storeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  storeText: {
    color: theme.textSecondary,
    fontSize: 11,
    maxWidth: 60,
  },
  timeText: {
    color: theme.textMuted,
    fontSize: 10,
  },
});

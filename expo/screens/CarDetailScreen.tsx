// Car detail screen — full listing view

import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import {
  ArrowLeft,
  BadgeCheck,
  ExternalLink,
  Heart,
  MapPin,
  Share2,
  Store,
  ThumbsUp,
  Truck,
} from "lucide-react-native";
import { useCallback } from "react";
import {
  Linking,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { theme } from "@/constants/theme";
import { formatPrice, formatRelativeTime, getCarMake } from "@/lib/api";
import { useFavorites } from "@/lib/favorites-context";
import type { CarListing } from "@/types/car";

type Props = {
  car: CarListing;
  onBack: () => void;
};

export function CarDetailScreen({ car, onBack }: Props) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const fav = isFavorite(car.id);
  const make = getCarMake(car.title);

  const handleShare = useCallback(async () => {
    try {
      const price = formatPrice(car.price, car.pricePreview, car.priceUnit);
      const shareContent = `${car.title}\n${price}\n${car.cityName ? `${car.cityName}` : ""}\nVoir sur Ouedkniss: ${car.link}`;
      
      if (Platform.OS === "web") {
        // Web fallback: copy to clipboard
        await navigator.clipboard.writeText(shareContent);
      } else {
        await Share.share({
          title: car.title,
          message: shareContent,
          url: car.link,
        });
      }
    } catch {
      // Fallback: open link
      await Linking.openURL(car.link);
    }
  }, [car]);

  // Display tags based on available data
  const tags = [];
  if (car.priceType === "FIXED") tags.push("Prix fixe");
  if (car.exchangeType === "NOT_EXCHANGEABLE") tags.push("Pas d'échange");
  if (car.hasDelivery) tags.push("Livraison disponible");
  if (car.storeIsOfficial) tags.push("Officiel");

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Hero image */}
      <View style={styles.heroWrap}>
        {car.imageUrl ? (
          <Image
            source={{ uri: car.imageUrl }}
            style={styles.heroImage}
            contentFit="cover"
            transition={200}
          />
        ) : (
          <View style={[styles.heroImage, styles.heroPlaceholder]}>
            <Text style={styles.heroPlaceholderText}>Pas d'image</Text>
          </View>
        )}
        <LinearGradient
          colors={["rgba(10,14,26,0.9)", "transparent", "rgba(10,14,26,0.6)"]}
          locations={[0, 0.3, 1]}
          style={styles.heroGradient}
        />

        {/* Top nav */}
        <View style={styles.heroNav}>
          <Pressable
            onPress={onBack}
            hitSlop={12}
            style={({ pressed }) => [styles.navBtn, pressed && styles.btnPressed]}
          >
            <ArrowLeft size={20} color={theme.text} />
          </Pressable>
          <View style={styles.navRight}>
            <Pressable
              onPress={handleShare}
              hitSlop={12}
              style={({ pressed }) => [styles.navBtn, pressed && styles.btnPressed]}
            >
              <Share2 size={18} color={theme.text} />
            </Pressable>
            <Pressable
              onPress={() => toggleFavorite(car)}
              hitSlop={12}
              style={({ pressed }) => [styles.navBtn, pressed && styles.btnPressed]}
            >
              <Heart
                size={20}
                color={fav ? theme.accentBright : theme.text}
                fill={fav ? theme.accentBright : "transparent"}
                strokeWidth={2.5}
              />
            </Pressable>
          </View>
        </View>

        {/* Make badge */}
        <View style={styles.heroMakeBadge}>
          <Text style={styles.heroMakeText}>{make}</Text>
        </View>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Title + price */}
        <Text style={styles.title}>{car.title}</Text>
        <View style={styles.priceRow}>
          <Text style={styles.price}>
            {formatPrice(car.price, car.pricePreview, car.priceUnit)}
          </Text>
          {car.oldPrice != null && car.oldPrice > 0 && (
            <Text style={styles.oldPrice}>
              {car.oldPricePreview ?? `${car.oldPrice.toLocaleString("fr-DZ")} DA`}
            </Text>
          )}
        </View>
        {car.exchangeType && (
          <View style={styles.exchangeBadge}>
            <Text style={styles.exchangeText}>
              {car.exchangeType === "exchange"
                ? "Échange possible"
                : "Vente uniquement"}
            </Text>
          </View>
        )}

        {/* Location + time */}
        <View style={styles.metaRow}>
          {car.cityName && (
            <View style={styles.metaItem}>
              <MapPin size={14} color={theme.accent} />
              <Text style={styles.metaText}>
                {car.cityName}
                {car.regionName ? `, ${car.regionName}` : ""}
              </Text>
            </View>
          )}
          {car.createdAt && (
            <View style={styles.metaItem}>
              <Text style={styles.metaTime}>
                {formatRelativeTime(car.createdAt)}
              </Text>
            </View>
          )}
        </View>

        {/* Specs grid - show tags for available data */}
        {tags.length > 0 && (
          <View style={styles.specsGrid}>
            {tags.map((tag, i) => (
              <View key={i} style={styles.specCard}>
                {tag === "Livraison disponible" ? (
                  <Truck size={20} color={theme.accent} />
                ) : (
                  <BadgeCheck size={20} color={theme.accent} />
                )}
                <Text style={styles.specValue} numberOfLines={2}>
                  {tag}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Note about specs */}
        <View style={styles.specsNote}>
          <Text style={styles.specsNoteText}>
            Les détails complets (année, kilométrage, carburant) sont disponibles sur Ouedkniss
          </Text>
        </View>

        {/* Seller info */}
        {car.storeName && (
          <View style={styles.sellerCard}>
            <View style={styles.sellerLeft}>
              {car.storeVerified ? (
                <BadgeCheck size={20} color={theme.teal} />
              ) : (
                <Store size={20} color={theme.textMuted} />
              )}
              <View>
                <Text style={styles.sellerName}>{car.storeName}</Text>
                <Text style={styles.sellerType}>
                  {car.storeVerified ? "Vendeur vérifié" : "Magasin"}
                </Text>
              </View>
            </View>
            {car.likeCount > 0 && (
              <View style={styles.likesRow}>
                <ThumbsUp size={13} color={theme.textMuted} />
                <Text style={styles.likesText}>{car.likeCount}</Text>
              </View>
            )}
          </View>
        )}

        {/* Description */}
        {car.description && (
          <View style={styles.descriptionCard}>
            <Text style={styles.descriptionLabel}>Description</Text>
            <Text style={styles.descriptionText}>{car.description}</Text>
          </View>
        )}

        {/* CTA buttons */}
        <View style={styles.ctaRow}>
          <Pressable
            onPress={() => Linking.openURL(car.link)}
            style={({ pressed }) => [
              styles.ctaPrimary,
              pressed && styles.btnPressed,
            ]}
          >
            <ExternalLink size={18} color={theme.bg} />
            <Text style={styles.ctaPrimaryText}>Voir sur Ouedkniss</Text>
          </Pressable>
          <Pressable
            onPress={() => toggleFavorite(car)}
            style={({ pressed }) => [
              styles.ctaSecondary,
              fav && styles.ctaSecondaryActive,
              pressed && styles.btnPressed,
            ]}
          >
            <Heart
              size={18}
              color={fav ? theme.bg : theme.text}
              fill={fav ? theme.bg : "transparent"}
              strokeWidth={2.5}
            />
            <Text style={[styles.ctaSecondaryText, fav && styles.ctaSecondaryTextActive]}>
              {fav ? "Sauvegardé" : "Sauvegarder"}
            </Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.bg,
  },
  heroWrap: {
    position: "relative",
    height: 320,
    backgroundColor: theme.bgElevated,
  },
  heroImage: {
    width: "100%",
    height: "100%",
  },
  heroPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  heroPlaceholderText: {
    color: theme.textMuted,
    fontSize: 15,
  },
  heroGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  heroNav: {
    position: "absolute",
    top: 56,
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  navRight: {
    flexDirection: "row",
    gap: 10,
  },
  navBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(10,14,26,0.7)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  heroMakeBadge: {
    position: "absolute",
    bottom: 16,
    left: 16,
    backgroundColor: "rgba(10,14,26,0.8)",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(232,112,58,0.4)",
  },
  heroMakeText: {
    color: theme.accentBright,
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 100,
    gap: 16,
    marginTop: -12,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: theme.bg,
  },
  title: {
    color: theme.text,
    fontSize: 22,
    fontWeight: "800",
    lineHeight: 28,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 12,
    flexWrap: "wrap",
  },
  price: {
    color: theme.accentBright,
    fontSize: 26,
    fontWeight: "900",
  },
  oldPrice: {
    color: theme.textMuted,
    fontSize: 15,
    textDecorationLine: "line-through",
  },
  exchangeBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: "rgba(46,179,146,0.15)",
    borderWidth: 1,
    borderColor: "rgba(46,179,146,0.3)",
  },
  exchangeText: {
    color: theme.teal,
    fontSize: 12,
    fontWeight: "700",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 12,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  metaText: {
    color: theme.textSecondary,
    fontSize: 14,
    fontWeight: "600",
  },
  metaTime: {
    color: theme.textMuted,
    fontSize: 12,
  },
  specsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  specCard: {
    flex: 1,
    minWidth: "46%",
    backgroundColor: theme.card,
    borderRadius: 14,
    padding: 14,
    gap: 6,
    borderWidth: 1,
    borderColor: theme.border,
  },
  specLabel: {
    color: theme.textMuted,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  specValue: {
    color: theme.text,
    fontSize: 15,
    fontWeight: "700",
  },
  specsNote: {
    backgroundColor: theme.card,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.border,
  },
  specsNoteText: {
    color: theme.textMuted,
    fontSize: 12,
    textAlign: "center",
    fontStyle: "italic",
  },
  sellerCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: theme.card,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.border,
  },
  sellerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  sellerName: {
    color: theme.text,
    fontSize: 15,
    fontWeight: "700",
  },
  sellerType: {
    color: theme.teal,
    fontSize: 12,
    fontWeight: "600",
  },
  likesRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  likesText: {
    color: theme.textMuted,
    fontSize: 13,
  },
  descriptionCard: {
    backgroundColor: theme.card,
    borderRadius: 14,
    padding: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: theme.border,
  },
  descriptionLabel: {
    color: theme.textSecondary,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  descriptionText: {
    color: theme.text,
    fontSize: 14,
    lineHeight: 22,
  },
  ctaRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 4,
  },
  ctaPrimary: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: theme.accent,
  },
  ctaPrimaryText: {
    color: theme.bg,
    fontSize: 15,
    fontWeight: "800",
  },
  ctaSecondary: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.border,
  },
  ctaSecondaryActive: {
    backgroundColor: theme.accent,
    borderColor: theme.accent,
  },
  ctaSecondaryText: {
    color: theme.text,
    fontSize: 15,
    fontWeight: "700",
  },
  ctaSecondaryTextActive: {
    color: theme.bg,
  },
  btnPressed: {
    opacity: 0.7,
  },
});

// Home screen — car listings feed with infinite scroll

import { useInfiniteQuery } from "@tanstack/react-query";
import { Heart, Search, SlidersHorizontal, TrendingUp, WifiOff } from "lucide-react-native";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { CarCard } from "@/components/CarCard";
import { FilterBar, RegionChips } from "@/components/FilterBar";
import { FilterSheet } from "@/components/FilterSheet";
import { SkeletonCard } from "@/components/SkeletonCard";
import { useFavorites } from "@/lib/favorites-context";
import { fetchCars } from "@/lib/api";
import { theme } from "@/constants/theme";
import { isOnline, formatErrorMessage } from "@/lib/network";
import type { CarFilters, CarListing } from "@/types/car";
import { DEFAULT_FILTERS } from "@/types/car";

// Number of skeleton cards to show during initial load
const SKELETON_COUNT = 6;

type HomeProps = {
  onCarPress: (car: CarListing) => void;
  onGoToFavorites: () => void;
};

export function HomeScreen({ onCarPress, onGoToFavorites }: HomeProps) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const [filters, setFilters] = useState<CarFilters>(DEFAULT_FILTERS);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);

  const queryKey = useMemo(
    () => ["cars", filters] as const,
    [filters]
  );

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isRefetching,
  } = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam }) => fetchCars(filters, pageParam, 20),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.hasMorePages ? allPages.length + 1 : undefined,
    retry: 1,
    staleTime: 30_000,
  });

  const allCars = useMemo(() => {
    const pages = data?.pages ?? [];
    const cars = pages.flatMap((p) => p.cars);
    // Deduplicate by id (in case of overlap)
    const seen = new Set<string>();
    return cars.filter((c) => {
      if (seen.has(c.id)) return false;
      seen.add(c.id);
      return true;
    });
  }, [data]);

  const totalCount = data?.pages[0]?.cars.length
    ? allCars.length
    : 0;

  const handleRegionSelect = useCallback((slug: string | null) => {
    setFilters((p) => ({ ...p, regionSlug: slug }));
  }, []);

  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const renderCar = useCallback(
    ({ item }: { item: CarListing }) => (
      <CarCard
        car={item}
        isFavorite={isFavorite(item.id)}
        onToggleFavorite={toggleFavorite}
        onPress={onCarPress}
      />
    ),
    [isFavorite, toggleFavorite, onCarPress]
  );

  const keyExtractor = useCallback((item: CarListing) => item.id, []);

  const listHeader = useMemo(
    () => (
      <View style={styles.headerWrap}>
        {/* Top bar */}
        <View style={styles.topBar}>
          <View style={styles.brandWrap}>
            <View style={styles.logoDot} />
            <Text style={styles.brandName}>DzSwoopa</Text>
          </View>
          <View style={styles.topActions}>
            <Pressable
              onPress={() => setFilterSheetOpen(true)}
              hitSlop={10}
              style={({ pressed }) => [styles.iconBtn, pressed && styles.btnPressed]}
            >
              <SlidersHorizontal size={18} color={theme.text} />
            </Pressable>
            <Pressable
              onPress={onGoToFavorites}
              hitSlop={10}
              style={({ pressed }) => [styles.iconBtn, pressed && styles.btnPressed]}
            >
              <Heart size={18} color={theme.text} />
            </Pressable>
          </View>
        </View>

        {/* Hero search bar */}
        <Pressable
          onPress={() => setFilterSheetOpen(true)}
          style={({ pressed }) => [styles.searchBar, pressed && styles.btnPressed]}
        >
          <Search size={17} color={theme.textMuted} />
          <Text style={styles.searchPlaceholder}>
            {filters.q.trim() || "Rechercher une voiture..."}
          </Text>
          <View style={styles.searchBadge}>
            <TrendingUp size={11} color={theme.accentBright} />
            <Text style={styles.searchBadgeText}>Live</Text>
          </View>
        </Pressable>

        {/* Region chips */}
        <RegionChips
          selectedRegion={filters.regionSlug}
          onSelect={handleRegionSelect}
        />

        {/* Filter bar */}
        <FilterBar
          filters={filters}
          onChange={setFilters}
          totalCount={totalCount}
        />
      </View>
    ),
    [filters, totalCount, handleRegionSelect, onGoToFavorites]
  );

  if (isLoading) {
    return (
      <View style={styles.stateContainer}>
        {listHeader}
        <View style={styles.skeletonContainer}>
          {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
            <SkeletonCard key={i} style={styles.skeletonCard} />
          ))}
        </View>
      </View>
    );
  }

  if (isError) {
    const offline = !isOnline();
    
    return (
      <View style={styles.stateContainer}>
        {listHeader}
        <View style={styles.errorBody}>
          {offline ? (
            <WifiOff size={48} color={theme.textMuted} />
          ) : (
            <Text style={styles.errorEmoji}>⚠️</Text>
          )}
          <Text style={styles.errorTitle}>
            {offline ? "Pas de connexion" : "Échec du chargement"}
          </Text>
          <Text style={styles.errorMsg}>
            {offline
              ? "Vérifiez votre connexion internet et réessayez."
              : formatErrorMessage(error)}
          </Text>
          <Pressable
            onPress={() => refetch()}
            style={({ pressed }) => [styles.retryBtn, pressed && styles.btnPressed]}
          >
            <Text style={styles.retryText}>Réessayer</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={allCars}
        renderItem={renderCar}
        keyExtractor={keyExtractor}
        ListHeaderComponent={listHeader}
        ListFooterComponent={
          isFetchingNextPage ? (
            <View style={styles.footerLoading}>
              <ActivityIndicator size="small" color={theme.accent} />
              <Text style={styles.footerText}>Chargement...</Text>
            </View>
          ) : allCars.length > 0 ? (
            <Text style={styles.endText}>— Fin des annonces —</Text>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🔍</Text>
            <Text style={styles.emptyTitle}>Aucune voiture trouvée</Text>
            <Text style={styles.emptyMsg}>
              Essayez de modifier vos filtres
            </Text>
            <Pressable
              onPress={() => setFilterSheetOpen(true)}
              style={({ pressed }) => [styles.retryBtn, pressed && styles.btnPressed]}
            >
              <Text style={styles.retryText}>Ouvrir les filtres</Text>
            </Pressable>
          </View>
        }
        contentContainerStyle={styles.listContent}
        columnWrapperStyle={styles.columnWrapper}
        numColumns={2}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={theme.accent}
            colors={[theme.accent]}
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        showsVerticalScrollIndicator={false}
      />

      <FilterSheet
        visible={filterSheetOpen}
        filters={filters}
        onClose={() => setFilterSheetOpen(false)}
        onApply={setFilters}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.bg,
  },
  stateContainer: {
    flex: 1,
    backgroundColor: theme.bg,
  },
  headerWrap: {
    gap: 12,
    paddingTop: 54,
    paddingBottom: 8,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  brandWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  logoDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.accent,
    shadowColor: theme.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
    elevation: 4,
  },
  brandName: {
    color: theme.text,
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  topActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: theme.card,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: theme.border,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginHorizontal: 16,
    paddingHorizontal: 16,
    paddingVertical: 13,
    backgroundColor: theme.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.border,
  },
  searchPlaceholder: {
    flex: 1,
    color: theme.textMuted,
    fontSize: 14,
  },
  searchBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "rgba(232,112,58,0.15)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  searchBadgeText: {
    color: theme.accentBright,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  columnWrapper: {
    gap: 12,
    marginBottom: 12,
  },
  skeletonContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    gap: 12,
  },
  skeletonCard: {
    width: "47%",
  },
  loadingBody: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    paddingBottom: 100,
  },
  loadingText: {
    color: theme.textSecondary,
    fontSize: 14,
    fontWeight: "500",
  },
  errorBody: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 40,
    paddingBottom: 100,
  },
  errorEmoji: {
    fontSize: 48,
  },
  errorTitle: {
    color: theme.text,
    fontSize: 18,
    fontWeight: "700",
  },
  errorMsg: {
    color: theme.textSecondary,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  retryBtn: {
    marginTop: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: theme.accent,
  },
  retryText: {
    color: theme.bg,
    fontSize: 14,
    fontWeight: "800",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  emptyEmoji: {
    fontSize: 48,
  },
  emptyTitle: {
    color: theme.text,
    fontSize: 18,
    fontWeight: "700",
  },
  emptyMsg: {
    color: theme.textSecondary,
    fontSize: 14,
  },
  footerLoading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
  },
  footerText: {
    color: theme.textSecondary,
    fontSize: 13,
  },
  endText: {
    color: theme.textMuted,
    fontSize: 12,
    textAlign: "center",
    paddingVertical: 20,
  },
  btnPressed: {
    opacity: 0.7,
  },
});

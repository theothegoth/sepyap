'use client';

import { useState, useEffect, useMemo, memo } from 'react';

interface PriceHistoryChartProps {
  data: {
    productId: number;
    days: number;
    markets: {
      market: string;
      marketProductId: number;
      currentPrice: number;
      currentPriceCard: number | null;
      history: {
        price: number;
        priceCard: number | null;
        recordedAt: string;
      }[];
    }[];
  };
}

// Lazy load recharts to handle case where it's not installed
let RechartsComponents: any = null;

async function loadRecharts() {
  if (RechartsComponents) return RechartsComponents;

  try {
    const recharts = await import('recharts');
    RechartsComponents = {
      LineChart: recharts.LineChart,
      Line: recharts.Line,
      XAxis: recharts.XAxis,
      YAxis: recharts.YAxis,
      CartesianGrid: recharts.CartesianGrid,
      Tooltip: recharts.Tooltip,
      Legend: recharts.Legend,
      ResponsiveContainer: recharts.ResponsiveContainer,
    };
    return RechartsComponents;
  } catch (error) {
    console.warn('Recharts not available, using fallback UI:', error);
    return null;
  }
}

function PriceHistoryChart({ data }: PriceHistoryChartProps) {
  const [recharts, setRecharts] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRecharts().then((components) => {
      setRecharts(components);
      setLoading(false);
    });
  }, []);

  if (!data.markets || data.markets.length === 0) {
    return <p className="text-gray-500 text-center py-8">No price history available</p>;
  }

  // Fallback UI if recharts is not available
  if (!loading && !recharts) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <p className="text-yellow-800 font-semibold mb-2">Chart Library Not Installed</p>
        <p className="text-yellow-700 text-sm mb-4">
          To view price history charts, please install recharts:
        </p>
        <code className="block bg-yellow-100 p-2 rounded text-sm mb-4">
          npm install recharts
        </code>
        <div className="text-sm text-gray-600">
          <p className="font-semibold mb-2">Price History Data:</p>
          {data.markets.map((marketData, idx) => (
            <div key={idx} className="mb-3 p-3 bg-white rounded">
              <p className="font-semibold">{marketData.market}</p>
              <p className="text-sm text-gray-600">
                Current: {marketData.currentPriceCard || marketData.currentPrice} TL
              </p>
              <p className="text-xs text-gray-500">
                {marketData.history.length} price records
              </p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (loading) {
    return <p className="text-gray-500 text-center py-8">Loading chart...</p>;
  }

  // Transform data for chart (memoized to prevent recalculation)
  const chartData = useMemo(() => {
    const dateMap = new Map<string, { [market: string]: number }>();

    data.markets.forEach((marketData) => {
      marketData.history.forEach((entry) => {
        const date = new Date(entry.recordedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        if (!dateMap.has(date)) {
          dateMap.set(date, {});
        }
        const dateData = dateMap.get(date)!;
        // Use card price if available, otherwise regular price
        dateData[marketData.market] = entry.priceCard || entry.price;
      });
    });

    // Convert to array and sort by date
    return Array.from(dateMap.entries())
      .map(([date, prices]) => ({
        date,
        ...prices,
      }))
      .sort((a, b) => {
        // Simple date comparison (for demo - in production use proper date parsing)
        return a.date.localeCompare(b.date);
      });
  }, [data.markets]);

  // Generate colors for each market (memoized)
  const marketColors = useMemo(() => {
    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];
    const marketNames = data.markets.map((m) => m.market);
    return { colors, marketNames };
  }, [data.markets]);

  if (chartData.length === 0) {
    return <p className="text-gray-500 text-center py-8">No price history data available</p>;
  }

  const {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
  } = recharts;

  return (
    <div className="w-full h-96">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis
            label={{ value: 'Price (TL)', angle: -90, position: 'insideLeft' }}
            domain={['dataMin - 5', 'dataMax + 5']}
          />
          <Tooltip
            formatter={(value: number) => `${value.toFixed(2)} TL`}
            labelStyle={{ color: '#000' }}
          />
          <Legend />
          {marketColors.marketNames.map((market, index) => (
            <Line
              key={market}
              type="monotone"
              dataKey={market}
              stroke={marketColors.colors[index % marketColors.colors.length]}
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default memo(PriceHistoryChart);


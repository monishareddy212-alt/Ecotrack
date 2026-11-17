import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calculator, History, RefreshCw } from 'lucide-react';
import { ActivityForm } from '../components/activities/ActivityForm';
import { Button } from '../components/ui/Button';
import { Card, CardHeader } from '../components/ui/Card';
import { FormError } from '../components/ui/FormError';
import { LoadingState } from '../components/ui/LoadingState';
import { PageHeader } from '../components/ui/PageHeader';
import { createActivity, fetchActivityTypes } from '../services/activityApi';
import type { ActivityType } from '../types/ecotrack';

export function AddActivityPage() {
  const [activityTypes, setActivityTypes] = useState<ActivityType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadTypes = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const items = await fetchActivityTypes();
      setActivityTypes(items);
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : 'Unable to load activity types from PostgreSQL.';
      setLoadError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTypes();
  }, [loadTypes]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Add Activity"
        description="Log a daily transportation, energy, or lifestyle activity. Activity types and emission calculations run directly against PostgreSQL."
        action={
          <Link
            to="/history"
            className="inline-flex items-center gap-2 rounded-lg border border-[#D4E0D8] bg-white px-4 py-2 text-sm font-medium text-[#18392C] hover:bg-[#F0F5F2] transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#176B52]"
          >
            <History className="h-4 w-4 text-[#176B52]" aria-hidden="true" />
            <span>View History</span>
          </Link>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Activity Details"
            description="Select a category and activity type to automatically lock its measurement unit and record your entry."
          />

          <div className="mt-6">
            {isLoading ? (
              <LoadingState label="Loading activity catalog from PostgreSQL..." />
            ) : loadError ? (
              <div className="space-y-4">
                <FormError message={loadError} />
                <Button variant="outline" onClick={() => void loadTypes()}>
                  <RefreshCw className="h-4 w-4" aria-hidden="true" />
                  <span>Retry Loading Catalog</span>
                </Button>
              </div>
            ) : (
              <ActivityForm
                activityTypes={activityTypes}
                onSubmit={async (payload) => {
                  const response = await createActivity(payload);
                  return response.activity;
                }}
              />
            )}
          </div>
        </Card>

        <Card className="flex flex-col justify-between bg-white">
          <div>
            <div className="flex items-center gap-2.5 text-[#176B52]">
              <Calculator className="h-5 w-5" aria-hidden="true" />
              <h2 className="text-base font-semibold text-[#18392C]">
                Emission Calculation Method
              </h2>
            </div>
            <p className="mt-3 text-sm text-[#64766C] leading-relaxed">
              Every activity is validated and calculated on the Express backend using fixed-point decimal arithmetic and stored in PostgreSQL as{' '}
              <span className="font-mono text-[#18392C]">NUMERIC(18,6)</span>.
            </p>
            <div className="mt-4 rounded-lg border border-[#E1EAE4] bg-[#F6F8F3] p-4">
              <p className="text-xs font-semibold text-[#18392C]">Core Formula</p>
              <p className="mt-1 font-mono text-xs text-[#176B52]">
                Emissions (kg CO₂e) = Quantity × Emission Factor
              </p>
            </div>
            <p className="mt-4 text-xs text-[#64766C] leading-relaxed">
              The backend selects the active{' '}
              <span className="font-mono text-[#18392C]">emission_factors</span> row whose{' '}
              <span className="font-mono text-[#18392C]">effective_date</span> is on or before the selected activity date.
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-[#E1EAE4] space-y-2.5">
            <p className="text-xs font-semibold text-[#18392C]">Seeded Factor Sources</p>
            <ul className="space-y-1.5 text-xs text-[#64766C]">
              <li>
                <span className="font-medium text-[#18392C]">Transportation:</span> India GHG Program (Car, Motorcycle, Bus) &amp; UK DESNZ 2024 proxy (Metro)
              </li>
              <li>
                <span className="font-medium text-[#18392C]">Energy:</span> CEA CO₂ Baseline v20.0 (Electricity) &amp; 2006 IPCC Vol. 2 (LPG)
              </li>
              <li>
                <span className="font-medium text-[#18392C]">Lifestyle:</span> Meal factors are left unconfigured until a regional dietary dataset is added.
              </li>
            </ul>
          </div>
        </Card>
      </div>
    </div>
  );
}

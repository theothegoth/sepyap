'use client';

import { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useBrandPreferences, BrandPreferenceSet } from '../hooks/useBrandPreferences';

interface BrandPreferencesManagerProps {
  selectedBrands: string[];
  excludedBrands: string[];
  onLoad: (includeBrands: string[], excludeBrands: string[]) => void;
}

export default function BrandPreferencesManager({
  selectedBrands,
  excludedBrands,
  onLoad
}: BrandPreferencesManagerProps) {
  const { t } = useLanguage();
  const {
    preferenceSets,
    currentSet,
    savePreferenceSet,
    loadPreferenceSet,
    deletePreferenceSet,
    clearCurrent
  } = useBrandPreferences();

  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [preferenceName, setPreferenceName] = useState('');

  const handleSave = () => {
    if (!preferenceName.trim()) {
      alert(t('home.preferenceName') + ' ' + t('common.required') || 'is required');
      return;
    }
    savePreferenceSet(preferenceName.trim(), selectedBrands, excludedBrands);
    setPreferenceName('');
    setShowSaveModal(false);
  };

  const handleLoad = (set: BrandPreferenceSet) => {
    onLoad(set.includeBrands, set.excludeBrands);
    loadPreferenceSet(set.id);
    setShowLoadModal(false);
  };

  const handleClear = () => {
    onLoad([], []);
    clearCurrent();
  };

  return (
    <div className="mb-3">
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setShowSaveModal(true)}
          className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
          title={t('home.saveBrandPreferences')}
        >
          💾 {t('home.saveCurrent')}
        </button>
        <button
          onClick={() => setShowLoadModal(true)}
          className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
          title={t('home.loadBrandPreferences')}
        >
          📂 {t('home.loadBrandPreferences')}
        </button>
        {(selectedBrands.length > 0 || excludedBrands.length > 0) && (
          <button
            onClick={handleClear}
            className="px-3 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            {t('home.clear')}
          </button>
        )}
      </div>

      {currentSet && (
        <div className="mt-2 text-xs text-gray-600">
          {t('home.activePreference')}: <span className="font-semibold">{currentSet.name}</span>
        </div>
      )}

      {/* Save Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50">
          <div className="card max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">{t('home.saveBrandPreferences')}</h3>
            <input
              type="text"
              placeholder={t('home.preferenceName')}
              value={preferenceName}
              onChange={(e) => setPreferenceName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              className="input w-full mb-4"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                className="flex-1 btn-primary"
              >
                {t('common.save')}
              </button>
              <button
                onClick={() => {
                  setShowSaveModal(false);
                  setPreferenceName('');
                }}
                className="flex-1 btn-secondary"
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Load Modal */}
      {showLoadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50">
          <div className="card max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">{t('home.savedPreferences')}</h3>
            {preferenceSets.length === 0 ? (
              <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">{t('home.noSavedPreferences')}</p>
            ) : (
              <div className="space-y-2 mb-4">
                {preferenceSets.map((set) => (
                  <div
                    key={set.id}
                    className={`p-3 border rounded-lg ${
                      currentSet?.id === set.id 
                        ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20' 
                        : 'border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-semibold text-sm text-gray-900 dark:text-gray-100">{set.name}</div>
                        <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                          {set.includeBrands.length > 0 && (
                            <div>
                              {t('home.includeBrands')}: {set.includeBrands.join(', ')}
                            </div>
                          )}
                          {set.excludeBrands.length > 0 && (
                            <div>
                              {t('home.excludeBrands')}: {set.excludeBrands.join(', ')}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1 ml-2">
                        <button
                          onClick={() => handleLoad(set)}
                          className="px-2 py-1 text-xs btn-primary"
                        >
                          {t('home.load')}
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('Delete this preference?')) {
                              deletePreferenceSet(set.id);
                            }
                          }}
                          className="px-2 py-1 text-xs btn-danger"
                        >
                          {t('home.delete')}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <button
              onClick={() => setShowLoadModal(false)}
              className="w-full btn-secondary"
            >
              {t('common.close')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


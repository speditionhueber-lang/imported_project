// 'use client';

// import { useState, useRef, useEffect, useCallback } from 'react';
// import { Input } from '@/components/ui/input';
// import { useMapsLibrary } from '@vis.gl/react-google-maps';
// import { useDebounce } from '@/hooks/use-debounce';

// interface AddressAutocompleteProps {
//   onAddressSelect: (address: {
//     street: string;
//     city: string;
//     zip: string;
//     country: string;
//     fullAddress: string;
//     lat: number;
//     lng: number;
//   }) => void;
//   value: string;
//   onValueChange: (value: string) => void;
//   id?: string;
//   label?: string;
//   className?: string;
// }

// export default function AddressAutocomplete({
//   onAddressSelect,
//   value,
//   onValueChange,
//   id,
//   label = 'Adresse suchen',
//   className,
// }: AddressAutocompleteProps) {
//   const [predictions, setPredictions] = useState<google.maps.places.AutocompletePrediction[]>([]);
//   const [status, setStatus] = useState<google.maps.places.PlacesServiceStatus | null>(null);
//   const [showSuggestions, setShowSuggestions] = useState(false);
//   const wrapperRef = useRef<HTMLDivElement>(null);
//   const places = useMapsLibrary('places');
//   const [autocompleteService, setAutocompleteService] = useState<google.maps.places.AutocompleteService | null>(null);
//   const [placesService, setPlacesService] = useState<google.maps.places.PlacesService | null>(null);
//   const debouncedValue = useDebounce(value, 300);

//   useEffect(() => {
//     if (places) {
//       setAutocompleteService(new places.AutocompleteService());
//       // Attaching to a dummy div as PlacesService requires a map or an HTML element.
//       const dummyDiv = document.createElement('div');
//       setPlacesService(new places.PlacesService(dummyDiv));
//     }
//   }, [places]);
  
//   const handleClickOutside = useCallback((event: MouseEvent) => {
//     if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
//       setShowSuggestions(false);
//     }
//   }, []);

//   useEffect(() => {
//     document.addEventListener('mousedown', handleClickOutside);
//     return () => document.removeEventListener('mousedown', handleClickOutside);
//   }, [handleClickOutside]);

//   useEffect(() => {
//     if (debouncedValue && autocompleteService) {
//       autocompleteService.getPlacePredictions(
//         { input: debouncedValue, componentRestrictions: { country: 'at' } },
//         (newPredictions, newStatus) => {
//           setPredictions(newPredictions || []);
//           setStatus(newStatus);
//           setShowSuggestions(true);
//         }
//       );
//     } else {
//       setPredictions([]);
//       setShowSuggestions(false);
//     }
//   }, [debouncedValue, autocompleteService]);

//   const handleSelect = (prediction: google.maps.places.AutocompletePrediction) => {
//     onValueChange(prediction.description);
//     setShowSuggestions(false);
    
//     if (placesService && prediction.place_id) {
//       placesService.getDetails({ placeId: prediction.place_id }, (place, status) => {
//         if (status === 'OK' && place && place.address_components && place.geometry?.location) {
//           const streetNumber = place.address_components.find(c => c.types.includes('street_number'))?.long_name || '';
//           const route = place.address_components.find(c => c.types.includes('route'))?.long_name || '';
//           const city = place.address_components.find(c => c.types.includes('locality'))?.long_name || '';
//           const zip = place.address_components.find(c => c.types.includes('postal_code'))?.long_name || '';
//           const country = place.address_components.find(c => c.types.includes('country'))?.long_name || '';

//           onAddressSelect({
//             street: `${route} ${streetNumber}`.trim(),
//             city,
//             zip,
//             country,
//             fullAddress: prediction.description,
//             lat: place.geometry.location.lat(),
//             lng: place.geometry.location.lng(),
//           });
//         }
//       });
//     }
//   };

//   return (
//     <div ref={wrapperRef} className="relative w-full">
//       <Input
//         id={id}
//         type="text"
//         value={value}
//         onChange={(e) => onValueChange(e.target.value)}
//         onFocus={() => setShowSuggestions(true)}
//         placeholder={label}
//         className={className}
//       />
//       {showSuggestions && predictions.length > 0 && (
//         <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
//           {predictions.map((prediction) => (
//             <div
//               key={prediction.place_id}
//               onClick={() => handleSelect(prediction)}
//               className="p-2 cursor-pointer hover:bg-gray-100"
//             >
//               {prediction.description}
//             </div>
//           ))}
//         </div>
//       )}
//     </div>
//   );
// }

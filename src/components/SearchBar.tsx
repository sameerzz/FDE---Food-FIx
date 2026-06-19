interface SearchBarProps {
  value: string;
  onChange: (val: string) => void;
}

export const SearchBar = ({ value, onChange }: SearchBarProps) => (
  <input 
    type="text" 
    value={value}
    onChange={(e) => onChange(e.target.value)}
    placeholder="Search for food or restaurants..." 
    className="w-full max-w-2xl mx-auto block bg-white border border-slate-100 shadow-lg rounded-2xl px-6 py-4 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-slate-700 outline-none transition-all"
  />
);

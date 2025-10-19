import type { TextInputProps } from '../../types/input';

export default function TextInput({ value, onChange, placeholder, type="text" }: TextInputProps){
    return(
        <input
            type={type}
            className="w-full px-3 py-2 my-2 border border-gray-300 rounded-xl text-base placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300"
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
        />
    )
}
  
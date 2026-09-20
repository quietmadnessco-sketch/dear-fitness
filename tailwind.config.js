/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        ink: '#131B26',
        inkraise: '#1B2431',
        chalk: '#F6F4EF',
        chalkdim: '#EAE6DC',
        signal: '#FF6A3D',
        signaldim: '#E85A2E',
        moss: '#3D8361',
        mossdim: '#2F6A4C',
        slate: '#8890A0',
        slatedim: '#5B6472',
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
      },
      borderRadius: {
        card: '18px',
      },
    },
  },
  plugins: [],
}

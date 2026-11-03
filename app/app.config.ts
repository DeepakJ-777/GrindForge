export default defineAppConfig({
  ui: {
    colors: {
      primary: 'primary',
      secondary: 'secondary',
    },
    button: {
      slots: {
        base: '!text-white !font-semibold',
      },
      variants: {
        variant: {
          solid: '!bg-[#3038b8] hover:!bg-[#252d88] active:!bg-[#1f276f]',
        },
      },
    },
  },
})

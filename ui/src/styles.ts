import styled from '@emotion/styled'
import Container from '@mui/material/Container';
import { Badge, BadgeProps, createTheme } from '@mui/material';

export const darkTheme = createTheme({
    palette: {
      mode: 'dark',
    }
  })

export const fabStyle = {
  position: 'absolute',
  bottom: 16,
  right: 16,
};

export const modelStyle = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 400,
  bgcolor: 'background.paper',
  border: '2px solid #000',
  boxShadow: 24,
  p: 4,
};

export const InlineBadge = styled(Badge)<BadgeProps>(() => ({
  '& .MuiBadge-badge': {
    right: -15,
    top: 12,
    border: `2px solid ${darkTheme.palette.background.paper}`,
    padding: '0 4px',
  },
}));


export const OuterContainer = styled(Container)`
padding: 10px;
`

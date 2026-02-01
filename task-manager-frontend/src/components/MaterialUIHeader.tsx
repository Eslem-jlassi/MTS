import * as React from 'react';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import AppBar from '@mui/material/AppBar';
import Button from '@mui/material/Button';
import CssBaseline from '@mui/material/CssBaseline';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Link from '@mui/material/Link';
import GlobalStyles from '@mui/material/GlobalStyles';
import ReceiptIcon from '@mui/icons-material/Receipt';
import '../output.css';

export default function MaterialUIHeader() {
    return (
        <ThemeProvider theme={createTheme()}>
            <GlobalStyles styles={{ ul: { margin: 0, padding: 0, listStyle: 'none' } }} />
            <CssBaseline />
            <AppBar
                position="static"
                color="info"
                elevation={0}
            >
                <Toolbar sx={{ flexWrap: 'wrap' }}>
                    <ReceiptIcon sx={{ mx: 1.5 }} />
                    <Typography variant="h6" color="inherit" noWrap sx={{ flexGrow: 1 }} className="font-bold">
                        Task Manager
                    </Typography>
                    <nav>
                        <Link
                            variant="button"
                            color="text.primary"
                            href="#"
                            sx={{ my: 1, mx: 1.5 }}
                        >
                            My profile
                        </Link>
                    </nav>
                    <Button color="inherit" href="#" variant="outlined" sx={{ my: 1, mx: 1.5 }}>
                        Sign Out
                    </Button>
                </Toolbar>
            </AppBar>
        </ThemeProvider>
    );
}
